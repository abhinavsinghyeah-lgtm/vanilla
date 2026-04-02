import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse, getWeekBounds } from '@/lib/utils'

// GET /api/dashboard — aggregated data for the overview dashboard
export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { start: weekStart } = getWeekBounds(today)

  const [todayPlan, streak, rewards, weeklyPlan, recentEvals] = await Promise.all([
    // Today's plan with tasks
    prisma.dailyPlan.findFirst({
      where: { userId: user.userId, planDate: today },
      include: { tasks: { orderBy: { createdAt: 'asc' } }, evaluation: true }
    }),

    // Streak data
    prisma.streak.findUnique({ where: { userId: user.userId } }),

    // Rewards
    prisma.reward.findMany({
      where: { userId: user.userId },
      orderBy: { targetStreak: 'asc' }
    }),

    // This week's plan
    prisma.weeklyPlan.findFirst({
      where: { userId: user.userId, weekStart },
      include: {
        dailyPlans: {
          include: {
            tasks: { select: { id: true, status: true, estimatedMinutes: true } },
            evaluation: { select: { performanceScore: true } }
          }
        }
      }
    }),

    // Last 7 evaluations for score chart
    prisma.evaluation.findMany({
      where: { userId: user.userId },
      orderBy: { evalDate: 'desc' },
      take: 7,
      select: { evalDate: true, performanceScore: true }
    })
  ])

  // Calculate today's stats
  const todayStats = todayPlan ? {
    totalTasks: todayPlan.tasks.length,
    completedTasks: todayPlan.tasks.filter(t => t.status === 'completed').length,
    missedTasks: todayPlan.tasks.filter(t => t.status === 'missed').length,
    totalMinutes: todayPlan.totalMinutesAllocated,
    completedMinutes: todayPlan.tasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.estimatedMinutes, 0),
    isEvaluated: !!todayPlan.evaluation,
    overloaded: todayPlan.totalMinutesAllocated > 120
  } : null

  // Weekly progress
  const weeklyStats = weeklyPlan ? {
    totalDays: weeklyPlan.dailyPlans.length,
    evaluatedDays: weeklyPlan.dailyPlans.filter(d => d.evaluation).length,
    avgScore: weeklyPlan.dailyPlans.reduce((sum, d) =>
      sum + (d.evaluation?.performanceScore ?? 0), 0
    ) / Math.max(weeklyPlan.dailyPlans.filter(d => d.evaluation).length, 1),
    totalTasks: weeklyPlan.dailyPlans.reduce((sum, d) => sum + d.tasks.length, 0),
    completedTasks: weeklyPlan.dailyPlans.reduce(
      (sum, d) => sum + d.tasks.filter(t => t.status === 'completed').length, 0
    )
  } : null

  return safeJsonResponse({
    todayPlan,
    todayStats,
    streak,
    rewards,
    weeklyStats,
    scoreHistory: recentEvals.reverse() // ascending for chart
  })
}
