import { clearAuthCookie } from '@/lib/auth'
import { safeJsonResponse } from '@/lib/utils'

export async function POST() {
  await clearAuthCookie()
  return safeJsonResponse({ success: true })
}
