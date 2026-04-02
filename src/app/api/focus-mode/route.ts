import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// POST /api/focus-mode — toggle focus mode
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const body = await req.json().catch(() => ({}))
  const { enabled } = body as { enabled?: boolean }

  const meta = await prisma.userMeta.upsert({
    where: { userId: user.userId },
    create: { userId: user.userId, focusModeOn: enabled ?? false },
    update: { focusModeOn: enabled ?? false }
  })

  return safeJsonResponse({ focusModeOn: meta.focusModeOn })
}

// GET /api/focus-mode — get focus mode state
export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  const meta = await prisma.userMeta.findUnique({ where: { userId: user.userId } })
  return safeJsonResponse({ focusModeOn: meta?.focusModeOn ?? false })
}
