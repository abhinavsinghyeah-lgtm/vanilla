import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// PATCH /api/tasks/[id] — update task status / proof
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const { id } = await params
  if (!id || typeof id !== 'string') return errorResponse('Invalid task id', 400)

  try {
    const body = await req.json()
    const { status, proofText, proofUrl } = body as {
      status?: string
      proofText?: string
      proofUrl?: string
    }

    // Validate ownership
    const task = await prisma.task.findFirst({
      where: { id, userId: user.userId }
    })
    if (!task) return errorResponse('Task not found', 404)

    const validStatuses = ['pending', 'in_progress', 'completed', 'missed', 'postponed']
    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      if (!validStatuses.includes(status)) return errorResponse('Invalid status', 400)
      updateData.status = status
      if (status === 'completed') updateData.completedAt = new Date()
      if (status !== 'completed') updateData.completedAt = null
    }

    if (proofText !== undefined) {
      updateData.proofText = String(proofText).trim().substring(0, 2000)
    }

    if (proofUrl !== undefined) {
      if (proofUrl && !/^https?:\/\//.test(proofUrl)) {
        return errorResponse('Proof URL must start with http:// or https://', 400)
      }
      updateData.proofUrl = proofUrl ? proofUrl.substring(0, 500) : null
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData
    })

    return safeJsonResponse({ task: updated })
  } catch (err) {
    console.error('[PATCH /api/tasks/:id]', err)
    return errorResponse('Internal server error', 500)
  }
}
