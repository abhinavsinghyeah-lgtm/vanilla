'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, Zap } from 'lucide-react'

export default function AICommandCard() {
  const [command, setCommand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch('/api/ai/command')
      const json = await res.json()
      setCommand(json.command ?? null)
    } catch {
      setCommand(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-yellow-500/10">
        <Loader2 className="h-4 w-4 text-yellow-500/50 animate-spin flex-shrink-0" />
        <span className="text-sm text-zinc-600 animate-pulse">Getting your command for today...</span>
      </div>
    )
  }

  if (!command) return null

  return (
    <div className="glass rounded-2xl p-4 border border-yellow-500/20 bg-yellow-500/5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-yellow-500/70 font-medium uppercase tracking-widest mb-1">Today's Command</p>
          <p className="text-sm font-semibold text-yellow-100 leading-relaxed">{command}</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
          title="Refresh command"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
