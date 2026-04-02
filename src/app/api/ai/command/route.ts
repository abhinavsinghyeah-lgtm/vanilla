import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse, formatDateISO } from '@/lib/utils'
import { generateAICommand } from '@/lib/ai'

// GET /api/ai/command — returns today's AI command (cached daily)
export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check cache
    const meta = await prisma.userMeta.findUnique({ where: { userId: user.userId } })

    if (
      meta?.aiCommandToday &&
      meta.aiCommandDate &&
      formatDateISO(meta.aiCommandDate) === formatDateISO(today)
    ) {
      return safeJsonResponse({ command: meta.aiCommandToday, cached: true })
    }

    // Get today's tasks for context
    const dailyPlan = await prisma.dailyPlan.findFirst({
      where: { userId: user.userId, planDate: today },
      include: {
        tasks: {
          where: { status: { in: ['pending', 'in_progress'] } },
          orderBy: { priority: 'asc' }
        }
      }
    })

    if (!dailyPlan || dailyPlan.tasks.length === 0) {
      return safeJsonResponse({ command: 'No tasks scheduled today. Set up your weekly plan.', cached: false })
    }

    const command = await generateAICommand(
      dailyPlan.tasks.map(t => ({
        title: t.title,
        category: t.category,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes
      }))
    )

    // Cache it
    await prisma.userMeta.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, aiCommandToday: command, aiCommandDate: today },
      update: { aiCommandToday: command, aiCommandDate: today }
    })

    return safeJsonResponse({ command, cached: false })
  } catch (err) {
    console.error('[GET /api/ai/command]', err)
    return errorResponse('AI service error', 503)
  }
}
