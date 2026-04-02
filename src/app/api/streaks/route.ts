import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const [streak, rewards] = await Promise.all([
    prisma.streak.findUnique({ where: { userId: user.userId } }),
    prisma.reward.findMany({
      where: { userId: user.userId },
      orderBy: { targetStreak: 'asc' }
    })
  ])

  return safeJsonResponse({ streak, rewards })
}
