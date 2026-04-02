import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// POST /api/task/[id]/complete
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const { proofText, proofUrl, timeSpentMinutes } = body as {
      proofText?: string
      proofUrl?: string
      timeSpentMinutes?: number
    }

    const task = await prisma.task.findFirst({
      where: { id, userId: user.userId }
    })
    if (!task) return errorResponse('Task not found', 404)

    if (proofUrl && !/^https?:\/\//.test(proofUrl)) {
      return errorResponse('Proof URL must start with http:// or https://', 400)
    }

    const now = new Date()
    // Calculate time spent from startedAt if not provided
    let timeSpent = timeSpentMinutes ?? 0
    if (!timeSpent && task.startedAt) {
      timeSpent = Math.round((now.getTime() - task.startedAt.getTime()) / 60000)
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: now,
        timeSpentMinutes: Math.min(timeSpent, 480), // cap 8 hrs
        proofText: proofText ? String(proofText).trim().substring(0, 2000) : task.proofText,
        proofUrl: proofUrl ? proofUrl.substring(0, 500) : task.proofUrl
      }
    })

    await prisma.userMeta.upsert({
      where: { userId: user.userId },
      create: { userId: user.userId, lastActiveAt: now },
      update: { lastActiveAt: now }
    })

    return safeJsonResponse({ task: updated })
  } catch (err) {
    console.error('[POST /api/task/:id/complete]', err)
    return errorResponse('Internal server error', 500)
  }
}
