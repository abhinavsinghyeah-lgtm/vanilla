import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse, getWeekBounds, formatDateISO } from '@/lib/utils'
import { generateWeeklyReview } from '@/lib/ai'
import { calculateGrade } from '@/lib/scoring'

// POST /api/review/weekly — generate AI weekly review for current week
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    // Accept optional weeklyPlanId, otherwise auto-find current/most-recent plan
    let weeklyPlanId: string | undefined
    try {
      const body = await req.json()
      weeklyPlanId = body?.weeklyPlanId
    } catch { /* no body — fine */ }

    const { start: weekStart, end: weekEnd } = getWeekBounds(new Date())

    const plan = await prisma.weeklyPlan.findFirst({
      where: weeklyPlanId
        ? { id: weeklyPlanId, userId: user.userId }
        : { userId: user.userId, weekStart: { gte: weekStart, lte: weekEnd } },
      orderBy: { weekStart: 'desc' },
      include: {
        dailyPlans: {
          include: {
            tasks: true,
            dailyScore: true,
            evaluation: true
          }
        },
        weeklyReview: true
      }
    })
    if (!plan) return errorResponse('No active weekly plan found. Create a weekly plan first.', 404)
    if (plan.weeklyReview) {
      const existing = { ...plan.weeklyReview, weekEnd: formatDateISO(plan.weekEnd) }
      return safeJsonResponse({ review: existing })
    }

    // Build context
    const allTasks = plan.dailyPlans.flatMap(d => d.tasks)
    const scores = plan.dailyPlans.map(d => d.dailyScore?.rawScore ?? 0).filter(Boolean)
    const weeklyScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    const reviewData = await generateWeeklyReview({
      weekStart: formatDateISO(plan.weekStart),
      goals: plan.goals as string[],
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      missedTasks: allTasks.filter(t => t.status === 'missed').length,
      avgScore: weeklyScore,
      dailyBreakdown: plan.dailyPlans.map(d => ({
        date: formatDateISO(d.planDate),
        score: d.dailyScore?.rawScore ?? 0,
        completed: d.tasks.filter(t => t.status === 'completed').length,
        total: d.tasks.length
      }))
    })

    const review = await prisma.weeklyReview.create({
      data: {
        userId: user.userId,
        weeklyPlanId: plan.id,
        weekStart: plan.weekStart,
        weeklyScore,
        grade: calculateGrade(weeklyScore),
        whatWorked: reviewData.whatWorked,
        whatFailed: reviewData.whatFailed,
        whatToImprove: reviewData.whatToImprove,
        aiSummary: reviewData.aiSummary
      }
    })

    return safeJsonResponse({ review: { ...review, weekEnd: formatDateISO(plan.weekEnd) } }, 201)
  } catch (err) {
    console.error('[POST /api/review/weekly]', err)
    return errorResponse('Internal server error', 500)
  }
}

// GET /api/review/weekly — get all weekly reviews with computed weekEnd
export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const rawReviews = await prisma.weeklyReview.findMany({
      where: { userId: user.userId },
      include: { weeklyPlan: { select: { weekEnd: true } } },
      orderBy: { weekStart: 'desc' },
      take: 12
    })

    const reviews = rawReviews.map(r => ({
      ...r,
      weekEnd: formatDateISO(r.weeklyPlan.weekEnd),
      weeklyPlan: undefined
    }))

    const { start: weekStart } = getWeekBounds(new Date())
    const current = reviews.find(r => new Date(r.weekStart) >= weekStart) ?? null

    return safeJsonResponse({ reviews, current })
  } catch (err) {
    console.error('[GET /api/review/weekly]', err)
    return errorResponse('Internal server error', 500)
  }
}
