import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse, formatDateISO } from '@/lib/utils'
import { calculateGrade } from '@/lib/scoring'

// POST /api/score/calculate — calculate + store daily score
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const body = await req.json()
    const { dailyPlanId } = body as { dailyPlanId?: string }
    if (!dailyPlanId) return errorResponse('dailyPlanId required', 400)

    const dailyPlan = await prisma.dailyPlan.findFirst({
      where: { id: dailyPlanId, userId: user.userId },
      include: { tasks: true, dailyScore: true }
    })
    if (!dailyPlan) return errorResponse('Daily plan not found', 404)

    // Tasks breakdown
    const total = dailyPlan.tasks.length
    if (total === 0) return errorResponse('No tasks to score', 400)

    const completed = dailyPlan.tasks.filter(t => t.status === 'completed')
    const completionPct = Math.round((completed.length / total) * 100)

    // Proof bonus: +5 per task with proof (max 20)
    const proofCount = completed.filter(t => t.proofText || t.proofUrl).length
    const proofBonus = Math.min(proofCount * 5, 20)

    // Priority bonus: +10 for each HIGH completed (max 20)
    const highCompleted = completed.filter(t => t.priority === 'high').length
    const priorityBonus = Math.min(highCompleted * 10, 20)

    // Penalty: -10 per carry-forward task missed
    const missedWithPenalty = dailyPlan.tasks.filter(t => t.status === 'missed' && t.carryForwardCount > 0)
    const penaltyDeduction = Math.min(missedWithPenalty.length * 10, 30)

    const rawScore = Math.min(
      Math.max(completionPct + proofBonus + priorityBonus - penaltyDeduction, 0),
      100
    )
    const grade = calculateGrade(rawScore)

    const score = await prisma.dailyScore.upsert({
      where: { dailyPlanId },
      create: {
        userId: user.userId,
        dailyPlanId,
        scoreDate: dailyPlan.planDate,
        rawScore,
        completionPct,
        proofBonus,
        priorityBonus,
        penaltyDeduction,
        grade
      },
      update: { rawScore, completionPct, proofBonus, priorityBonus, penaltyDeduction, grade }
    })

    return safeJsonResponse({ score })
  } catch (err) {
    console.error('[POST /api/score/calculate]', err)
    return errorResponse('Internal server error', 500)
  }
}

// GET /api/score/calculate?days=7 — get score history
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const url = new URL(req.url)
  const days = Math.min(Number(url.searchParams.get('days') ?? 7), 30)

  const scores = await prisma.dailyScore.findMany({
    where: { userId: user.userId },
    orderBy: { scoreDate: 'desc' },
    take: days
  })

  const weeklyAvg = scores.length > 0
    ? Math.round(scores.reduce((s, x) => s + x.rawScore, 0) / scores.length)
    : 0

  return safeJsonResponse({ scores: scores.reverse(), weeklyAvg })
}
