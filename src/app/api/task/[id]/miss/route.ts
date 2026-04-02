import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'
import { addDays } from 'date-fns'

// POST /api/task/[id]/miss — marks missed + carries forward to next day
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { id } = await params

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.userId },
      include: { dailyPlan: true }
    })
    if (!task) return errorResponse('Task not found', 404)
    if (task.status === 'completed') return errorResponse('Cannot miss a completed task', 400)

    // Mark as missed
    await prisma.task.update({
      where: { id },
      data: { status: 'missed' }
    })

    // Carry forward: find or create next-day daily plan
    const nextDate = addDays(new Date(task.dailyPlan.planDate), 1)
    nextDate.setHours(0, 0, 0, 0)

    let nextDailyPlan = await prisma.dailyPlan.findFirst({
      where: { userId: user.userId, planDate: nextDate }
    })

    // If next day plan exists, create carry-forward task there
    if (nextDailyPlan) {
      const newPenaltyWeight = Math.min(task.penaltyWeight * 1.5, 3.0) // max 3x pressure
      const newCarryCount = task.carryForwardCount + 1

      await prisma.task.create({
        data: {
          userId: user.userId,
          weeklyPlanId: task.weeklyPlanId,
          dailyPlanId: nextDailyPlan.id,
          title: task.title,
          description: task.description,
          category: task.category,
          estimatedMinutes: task.estimatedMinutes,
          priority: 'high', // escalate priority on carry-forward
          status: 'pending',
          carryForwardCount: newCarryCount,
          penaltyWeight: newPenaltyWeight,
          originalDailyPlanId: task.originalDailyPlanId ?? task.dailyPlanId
        }
      })

      return safeJsonResponse({
        missed: true,
        carriedForward: true,
        nextDate: nextDate.toISOString(),
        carryForwardCount: newCarryCount,
        penaltyWeight: newPenaltyWeight
      })
    }

    return safeJsonResponse({ missed: true, carriedForward: false })
  } catch (err) {
    console.error('[POST /api/task/:id/miss]', err)
    return errorResponse('Internal server error', 500)
  }
}
