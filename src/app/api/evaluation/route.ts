import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateDailyEvaluation } from '@/lib/ai'
import { safeJsonResponse, errorResponse, formatDateISO } from '@/lib/utils'

// POST /api/evaluation — submit daily evaluation
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const body = await req.json()
    const { dailyPlanId, userNotes } = body as {
      dailyPlanId?: string
      userNotes?: string
    }

    if (!dailyPlanId) return errorResponse('dailyPlanId is required', 400)

    // Validate ownership + not already evaluated
    const dailyPlan = await prisma.dailyPlan.findFirst({
      where: { id: dailyPlanId, userId: user.userId },
      include: {
        tasks: true,
        evaluation: true
      }
    })
    if (!dailyPlan) return errorResponse('Daily plan not found', 404)
    if (dailyPlan.evaluation) return errorResponse('This day has already been evaluated', 409)
    if (dailyPlan.tasks.length === 0) return errorResponse('No tasks to evaluate', 400)

    // Get streak
    let streak = await prisma.streak.findUnique({ where: { userId: user.userId } })
    if (!streak) {
      streak = await prisma.streak.create({ data: { userId: user.userId } })
    }

    // Build AI input
    const aiInput = {
      date: formatDateISO(dailyPlan.planDate),
      plannedTasks: dailyPlan.tasks.map(t => ({
        title: t.title,
        category: t.category,
        estimatedMinutes: t.estimatedMinutes,
        status: t.status as 'completed' | 'missed' | 'in_progress' | 'pending',
        proofText: t.proofText ?? undefined,
        proofUrl: t.proofUrl ?? undefined
      })),
      userNotes: userNotes ? String(userNotes).trim().substring(0, 1000) : undefined,
      currentStreak: streak.currentStreak
    }

    // Call AI
    const aiResult = await generateDailyEvaluation(aiInput)

    // Calculate new streak
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const planDate = new Date(dailyPlan.planDate)
    planDate.setHours(0, 0, 0, 0)

    let newCurrentStreak = streak.currentStreak
    let newLongestStreak = streak.longestStreak
    const streakMaintained = aiResult.streakStatus !== 'broken'

    if (streakMaintained) {
      newCurrentStreak += 1
      if (newCurrentStreak > newLongestStreak) newLongestStreak = newCurrentStreak
    } else {
      newCurrentStreak = 0
    }

    // Persist evaluation + update streak + mark daily plan as evaluated
    const result = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.create({
        data: {
          userId: user.userId,
          dailyPlanId: dailyPlan.id,
          evalDate: planDate,
          userNotes: aiInput.userNotes ?? null,
          aiEvaluation: aiResult.evaluation,
          performanceScore: aiResult.score,
          nextDayAdjustments: aiResult.nextDayAdjustments,
          penaltiesApplied: aiResult.penaltiesApplied
        }
      })

      await tx.dailyPlan.update({
        where: { id: dailyPlan.id },
        data: { status: 'evaluated' }
      })

      await tx.streak.update({
        where: { userId: user.userId },
        data: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastEvaluatedDate: planDate,
          totalCompletedDays: { increment: streakMaintained ? 1 : 0 }
        }
      })

      // Check and unlock rewards
      const rewards = await tx.reward.findMany({
        where: { userId: user.userId, isUnlocked: false }
      })
      for (const reward of rewards) {
        if (newCurrentStreak >= reward.targetStreak) {
          await tx.reward.update({
            where: { id: reward.id },
            data: { isUnlocked: true, unlockedAt: new Date() }
          })
        }
      }

      return evaluation
    })

    return safeJsonResponse({
      evaluation: result,
      aiResult,
      newStreak: newCurrentStreak,
      streakStatus: aiResult.streakStatus
    }, 201)
  } catch (err) {
    console.error('[POST /api/evaluation]', err)
    if (err instanceof Error && err.message.includes('AI')) {
      return errorResponse('AI service error. Check your GROQ_API_KEY.', 503)
    }
    return errorResponse('Internal server error', 500)
  }
}

// GET /api/evaluation — get evaluation history
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 7), 30)

  const evaluations = await prisma.evaluation.findMany({
    where: { userId: user.userId },
    orderBy: { evalDate: 'desc' },
    take: limit,
    include: {
      dailyPlan: {
        include: { tasks: { select: { id: true, title: true, status: true, category: true } } }
      }
    }
  })

  return safeJsonResponse({ evaluations })
}
