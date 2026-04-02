import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'
import { safeJsonResponse, errorResponse } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return errorResponse('Username is required', 400)
    }
    if (!password || typeof password !== 'string' || password.length === 0) {
      return errorResponse('Password is required', 400)
    }

    // Sanitize: reject obvious injection attempts
    if (username.length > 50 || !/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      return errorResponse('Invalid credentials', 401)
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    })

    if (!user) {
      // Constant-time response to prevent user enumeration
      await bcrypt.compare('dummy', '$2b$12$dummyhashfortimingnormalization')
      return errorResponse('Invalid credentials', 401)
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return errorResponse('Invalid credentials', 401)
    }

    const token = await signToken({ userId: user.id, username: user.username })
    await setAuthCookie(token)

    return safeJsonResponse({ success: true, username: user.username })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return errorResponse('Internal server error', 500)
  }
}
