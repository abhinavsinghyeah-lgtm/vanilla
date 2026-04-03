import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse } from '@/lib/utils'
import { NextRequest } from 'next/server'

// POST /api/admin/clear — clear task data with security confirmation
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const body = await req.json()
    const { action, confirmPhrase, taskIds } = body as {
      action: 'clear_all' | 'clear_week' | 'clear_tasks'
      confirmPhrase?: string
      taskIds?: string[]
    }

    // Double confirmation for destructive actions
    if (action === 'clear_all') {
      if (confirmPhrase !== 'DELETE EVERYTHING') {
        return errorResponse('Type "DELETE EVERYTHING" to confirm', 400)
      }

      // Delete in order to respect foreign key constraints
      await prisma.$transaction([
        prisma.dailyScore.deleteMany({ where: { userId: user.userId } }),
        prisma.evaluation.deleteMany({ where: { userId: user.userId } }),
        prisma.weeklyReview.deleteMany({ where: { userId: user.userId } }),
        prisma.task.deleteMany({ where: { userId: user.userId } }),
        prisma.dailyPlan.deleteMany({ where: { userId: user.userId } }),
        prisma.weeklyPlan.deleteMany({ where: { userId: user.userId } }),
        prisma.streak.deleteMany({ where: { userId: user.userId } }),
        prisma.reward.deleteMany({ where: { userId: user.userId } }),
        prisma.userMeta.deleteMany({ where: { userId: user.userId } }),
      ])

      return safeJsonResponse({ success: true, message: 'All data cleared' })
    }

    if (action === 'clear_week') {
      if (confirmPhrase !== 'CLEAR WEEK') {
        return errorResponse('Type "CLEAR WEEK" to confirm', 400)
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dayOfWeek = today.getDay()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

      const weeklyPlan = await prisma.weeklyPlan.findFirst({
        where: { userId: user.userId, weekStart },
        include: { dailyPlans: true }
      })

      if (weeklyPlan) {
        const dailyPlanIds = weeklyPlan.dailyPlans.map(d => d.id)
        await prisma.$transaction([
          prisma.dailyScore.deleteMany({ where: { dailyPlanId: { in: dailyPlanIds } } }),
          prisma.evaluation.deleteMany({ where: { dailyPlanId: { in: dailyPlanIds } } }),
          prisma.weeklyReview.deleteMany({ where: { weeklyPlanId: weeklyPlan.id } }),
          prisma.task.deleteMany({ where: { weeklyPlanId: weeklyPlan.id } }),
          prisma.dailyPlan.deleteMany({ where: { weeklyPlanId: weeklyPlan.id } }),
          prisma.weeklyPlan.delete({ where: { id: weeklyPlan.id } }),
        ])
      }

      // Clear AI command cache
      await prisma.userMeta.updateMany({
        where: { userId: user.userId },
        data: { aiCommandToday: null, aiCommandDate: null }
      })

      return safeJsonResponse({ success: true, message: 'Current week cleared' })
    }

    if (action === 'clear_tasks') {
      if (!taskIds || taskIds.length === 0) {
        return errorResponse('No tasks selected', 400)
      }

      await prisma.task.deleteMany({
        where: { id: { in: taskIds }, userId: user.userId }
      })

      return safeJsonResponse({ success: true, message: `${taskIds.length} tasks deleted` })
    }

    return errorResponse('Invalid action', 400)
  } catch (err) {
    console.error('[POST /api/admin/clear]', err)
    return errorResponse('Server error', 500)
  }
}
