import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// GET /api/daily-plan — get today's daily plan (or by ?date=YYYY-MM-DD)
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const url = new URL(req.url)
  const dateParam = url.searchParams.get('date')

  let planDate: Date
  if (dateParam) {
    planDate = new Date(dateParam)
    if (isNaN(planDate.getTime())) return errorResponse('Invalid date param', 400)
  } else {
    planDate = new Date()
    planDate.setHours(0, 0, 0, 0)
  }

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: {
      userId: user.userId,
      planDate: planDate
    },
    include: {
      tasks: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
      evaluation: true,
      weeklyPlan: { select: { goals: true, weekStart: true } }
    }
  })

  return safeJsonResponse({ dailyPlan })
}
