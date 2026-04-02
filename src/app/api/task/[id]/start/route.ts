import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// POST /api/task/[id]/start
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { id } = await params

  const task = await prisma.task.findFirst({
    where: { id, userId: user.userId }
  })
  if (!task) return errorResponse('Task not found', 404)
  if (task.status === 'completed') return errorResponse('Task already completed', 400)
  if (task.status === 'missed') return errorResponse('Task already missed', 400)

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: 'in_progress',
      startedAt: task.startedAt ?? new Date() // don't overwrite if resuming
    }
  })

  // Update lastActiveAt
  await prisma.userMeta.upsert({
    where: { userId: user.userId },
    create: { userId: user.userId, lastActiveAt: new Date() },
    update: { lastActiveAt: new Date() }
  })

  return safeJsonResponse({ task: updated })
}
