import { getAuthUser } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)
  return safeJsonResponse({ userId: user.userId, username: user.username })
}
