import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// GET /api/discipline — compute discipline score (0-100%)
export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  fourteenDaysAgo.setHours(0, 0, 0, 0)

  const [streak, recentTasks, recentEvals, firstTask] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.userId } }),

    // All tasks from last 14 days
    prisma.task.findMany({
      where: {
        userId: user.userId,
        createdAt: { gte: fourteenDaysAgo },
      },
      select: { status: true },
    }),

    // Recent evaluation scores
    prisma.evaluation.findMany({
      where: {
        userId: user.userId,
        evalDate: { gte: fourteenDaysAgo },
      },
      select: { performanceScore: true },
      orderBy: { evalDate: 'desc' },
      take: 14,
    }),

    // First ever task (to compute days since start)
    prisma.task.findFirst({
      where: { userId: user.userId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])

  // 1. Streak factor (25%) — current vs best (floor 7)
  const currentStreak = streak?.currentStreak ?? 0
  const longestStreak = Math.max(streak?.longestStreak ?? 0, 7)
  const streakScore = Math.min((currentStreak / longestStreak) * 100, 100)

  // 2. Task completion (25%) — completed / total from last 14 days
  const totalTasks = recentTasks.length
  const completedTasks = recentTasks.filter(t => t.status === 'completed').length
  const missedTasks = recentTasks.filter(t => t.status === 'missed').length
  const taskScore = totalTasks > 0
    ? Math.max(((completedTasks - missedTasks * 0.5) / totalTasks) * 100, 0)
    : 0

  // 3. AI evaluation avg (25%) — avg performanceScore from recent evals
  const evalAvg = recentEvals.length > 0
    ? recentEvals.reduce((s, e) => s + e.performanceScore, 0) / recentEvals.length
    : 0

  // 4. Consistency / show-up (25%) — totalCompletedDays / days since first activity
  const totalCompletedDays = streak?.totalCompletedDays ?? 0
  let daysSinceStart = 1
  if (firstTask) {
    const diff = Math.floor((Date.now() - firstTask.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    daysSinceStart = Math.max(diff, 1)
  }
  const consistencyScore = Math.min((totalCompletedDays / daysSinceStart) * 100, 100)

  // Weighted total
  const discipline = Math.round(
    streakScore * 0.25 +
    taskScore * 0.25 +
    evalAvg * 0.25 +
    consistencyScore * 0.25
  )

  return safeJsonResponse({
    discipline: Math.min(Math.max(discipline, 0), 100),
    breakdown: {
      streak: Math.round(streakScore),
      taskCompletion: Math.round(taskScore),
      evalAvg: Math.round(evalAvg),
      consistency: Math.round(consistencyScore),
    },
    raw: {
      currentStreak,
      totalTasks,
      completedTasks,
      missedTasks,
      evalCount: recentEvals.length,
      totalCompletedDays,
      daysSinceStart,
    },
  })
}
