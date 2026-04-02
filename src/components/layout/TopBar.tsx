'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { LogOut, User } from 'lucide-react'

interface TopBarProps {
  username: string
}

export default function TopBar({ username }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-zinc-800/60 flex items-center justify-between px-6 bg-zinc-950/20">
      <div className="text-sm text-zinc-500">
        {format(new Date(), "EEEE, MMMM do")}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
          <User className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-300 font-medium">{username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </header>
  )
}
