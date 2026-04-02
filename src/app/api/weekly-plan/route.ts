import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateWeeklyPlan } from '@/lib/ai'
import { safeJsonResponse, errorResponse, getWeekBounds, formatDateISO } from '@/lib/utils'

// GET /api/weekly-plan — get current or specified week plan
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const url = new URL(req.url)
  const weekParam = url.searchParams.get('week') // ISO date (Monday)

  let weekStart: Date
  if (weekParam) {
    weekStart = new Date(weekParam)
    if (isNaN(weekStart.getTime())) return errorResponse('Invalid week param', 400)
  } else {
    weekStart = getWeekBounds().start
  }

  const plan = await prisma.weeklyPlan.findFirst({
    where: {
      userId: user.userId,
      weekStart: weekStart
    },
    include: {
      dailyPlans: {
        include: {
          tasks: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
          evaluation: true
        },
        orderBy: { planDate: 'asc' }
      }
    }
  })

  return safeJsonResponse({ plan })
}

// POST /api/weekly-plan — create new plan with AI
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const body = await req.json()
    const { goals, pendingTasks } = body as {
      goals?: string[]
      pendingTasks?: Array<{
        title: string
        estimatedMinutes: number
        priority: 'high' | 'medium' | 'low'
        category: 'output' | 'sales' | 'improvement'
      }>
    }

    // Validate
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return errorResponse('At least one goal is required', 400)
    }
    if (!pendingTasks || !Array.isArray(pendingTasks) || pendingTasks.length === 0) {
      return errorResponse('At least one task is required', 400)
    }
    if (goals.length > 10) return errorResponse('Max 10 goals per week', 400)
    if (pendingTasks.length > 50) return errorResponse('Max 50 tasks per week', 400)

    // Sanitize goals
    const sanitizedGoals = goals
      .map(g => String(g).trim().substring(0, 200))
      .filter(Boolean)

    // Sanitize tasks
    const sanitizedTasks = pendingTasks.map(t => ({
      title: String(t.title).trim().substring(0, 200),
      estimatedMinutes: Math.min(Math.max(Number(t.estimatedMinutes) || 30, 5), 120),
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium' as const,
      category: ['output', 'sales', 'improvement'].includes(t.category) ? t.category : 'output' as const
    }))

    const { start: weekStart, end: weekEnd } = getWeekBounds()

    // Check if plan already exists for this week
    const existing = await prisma.weeklyPlan.findFirst({
      where: { userId: user.userId, weekStart }
    })
    if (existing) return errorResponse('A plan already exists for this week. Use PUT to update.', 409)

    // Call AI
    const aiPlan = await generateWeeklyPlan({
      goals: sanitizedGoals,
      pendingTasks: sanitizedTasks,
      weekStart: formatDateISO(weekStart)
    })

    // Persist plan + daily plans + tasks in a transaction
    const plan = await prisma.$transaction(async (tx) => {
      const weeklyPlan = await tx.weeklyPlan.create({
        data: {
          userId: user.userId,
          weekStart,
          weekEnd,
          goals: sanitizedGoals,
          pendingTasks: sanitizedTasks,
          aiPlan: aiPlan as unknown as import('@prisma/client').Prisma.InputJsonValue,
          status: 'active'
        }
      })

      for (const day of aiPlan.days) {
        const planDate = new Date(day.date)
        const dayIndex = (planDate.getDay() + 6) % 7 // 0=Mon, 6=Sun

        const dailyPlan = await tx.dailyPlan.create({
          data: {
            weeklyPlanId: weeklyPlan.id,
            userId: user.userId,
            planDate,
            dayIndex,
            aiReasoning: day.reasoning,
            totalMinutesAllocated: day.totalMinutes,
            status: 'pending'
          }
        })

        for (const task of day.tasks) {
          await tx.task.create({
            data: {
              userId: user.userId,
              weeklyPlanId: weeklyPlan.id,
              dailyPlanId: dailyPlan.id,
              title: task.title,
              description: task.description,
              category: task.category,
              estimatedMinutes: task.estimatedMinutes,
              priority: task.priority,
              status: 'pending'
            }
          })
        }
      }

      return weeklyPlan
    })

    const fullPlan = await prisma.weeklyPlan.findUnique({
      where: { id: plan.id },
      include: {
        dailyPlans: {
          include: { tasks: true },
          orderBy: { planDate: 'asc' }
        }
      }
    })

    return safeJsonResponse({ plan: fullPlan }, 201)
  } catch (err) {
    console.error('[POST /api/weekly-plan]', err)
    if (err instanceof Error && err.message.includes('AI')) {
      return errorResponse('AI service error. Check your GROQ_API_KEY.', 503)
    }
    return errorResponse('Internal server error', 500)
  }
}
