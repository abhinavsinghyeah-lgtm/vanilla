import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse } from '@/lib/utils'
import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// POST /api/ai/plan-review — user submits their plan, AI analyzes and generates command
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const { userPlan } = (await req.json()) as { userPlan: string }

    if (!userPlan || userPlan.trim().length < 10) {
      return errorResponse('Write at least a brief plan (10+ characters)', 400)
    }

    if (userPlan.length > 2000) {
      return errorResponse('Plan too long (max 2000 characters)', 400)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's tasks for context
    const dailyPlan = await prisma.dailyPlan.findFirst({
      where: { userId: user.userId, planDate: today },
      include: {
        tasks: { orderBy: { priority: 'asc' } },
        weeklyPlan: { select: { goals: true } },
      },
    })

    const tasksContext = dailyPlan?.tasks.map(t =>
      `[${t.priority.toUpperCase()}] [${t.category}] ${t.title} (${t.estimatedMinutes}min) — ${t.status}`
    ).join('\n') || 'No tasks scheduled'

    const goalsContext = dailyPlan?.weeklyPlan?.goals
      ? (dailyPlan.weeklyPlan.goals as string[]).join(', ')
      : 'No goals set'

    const prompt = `You are a strict, high-performance execution coach analyzing someone's daily plan.

WEEKLY GOALS: ${goalsContext}

TODAY'S SCHEDULED TASKS:
${tasksContext}

USER'S PLAN & ROADMAP FOR TODAY:
"${userPlan.trim()}"

ANALYZE their plan and respond with valid JSON:
{
  "analysis": "2-3 sentences evaluating their plan. Is it realistic? Are they prioritizing correctly? Any blind spots?",
  "command": "ONE single tactical command/instruction for RIGHT NOW. Be ultra-specific — reference their exact plan and tasks. Make it actionable in the next 5 minutes.",
  "warnings": ["any concerns about their approach — can be empty array"],
  "score": number (1-10, how good their plan is)
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return errorResponse('AI returned empty response', 503)

    const result = JSON.parse(content)

    // Cache the command
    await prisma.userMeta.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, aiCommandToday: result.command, aiCommandDate: today },
      update: { aiCommandToday: result.command, aiCommandDate: today },
    })

    return safeJsonResponse({
      analysis: result.analysis,
      command: result.command,
      warnings: result.warnings || [],
      planScore: result.score,
    })
  } catch (err) {
    console.error('[POST /api/ai/plan-review]', err)
    return errorResponse('AI service error', 503)
  }
}
