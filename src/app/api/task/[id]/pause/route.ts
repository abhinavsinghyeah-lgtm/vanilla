import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// POST /api/task/[id]/pause — pause in-progress task, save elapsed time
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const { elapsedMinutes } = body as { elapsedMinutes?: number }

    const task = await prisma.task.findFirst({
      where: { id, userId: user.userId }
    })
    if (!task) return errorResponse('Task not found', 404)

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: 'pending', // back to pending (can be restarted)
        timeSpentMinutes: task.timeSpentMinutes + Math.min(elapsedMinutes ?? 0, 480)
      }
    })

    return safeJsonResponse({ task: updated })
  } catch (err) {
    console.error('[POST /api/task/:id/pause]', err)
    return errorResponse('Internal server error', 500)
  }
}
