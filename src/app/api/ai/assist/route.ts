import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { generateLiveAssist } from '@/lib/ai'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

// POST /api/ai/assist — in-task AI chat (Live Mode)
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return errorResponse('Unauthorized', 401)

  try {
    const body = await req.json()
    const { message, taskContext } = body as {
      message?: string
      taskContext?: {
        title: string
        description?: string
        category: string
        priority: string
      }
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse('Message is required', 400)
    }
    if (message.length > 500) return errorResponse('Message too long', 400)

    const reply = await generateLiveAssist(message.trim(), taskContext)
    return safeJsonResponse({ reply })
  } catch (err) {
    console.error('[POST /api/ai/assist]', err)
    return errorResponse('AI service error', 503)
  }
}
