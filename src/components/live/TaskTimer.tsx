'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, CheckCircle2, XCircle } from 'lucide-react'

interface TaskTimerProps {
  estimatedMinutes: number
  isRunning: boolean
  accumulatedSeconds?: number
  onTimeUp: () => void
}

export default function TaskTimer({ estimatedMinutes, isRunning, accumulatedSeconds = 0, onTimeUp }: TaskTimerProps) {
  const totalSeconds = estimatedMinutes * 60
  const [elapsed, setElapsed] = useState(accumulatedSeconds)
  const [showTimeUp, setShowTimeUp] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const calledTimeUp = useRef(false)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          if (next >= totalSeconds && !calledTimeUp.current) {
            calledTimeUp.current = true
            setShowTimeUp(true)
            onTimeUp()
          }
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, totalSeconds, onTimeUp])

  const remaining = Math.max(totalSeconds - elapsed, 0)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const pct = Math.min((elapsed / totalSeconds) * 100, 100)
  const isOvertime = elapsed > totalSeconds

  function formatTime(m: number, s: number) {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const overtimeSecs = elapsed - totalSeconds
  const overtimeMin = Math.floor(overtimeSecs / 60)
  const overtimeSec = overtimeSecs % 60

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular progress */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke={isOvertime ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isOvertime ? (
            <>
              <span className="text-red-400 text-xs font-medium">+OVERTIME</span>
              <span className="text-2xl font-bold text-red-400 tabular-nums">
                +{formatTime(overtimeMin, overtimeSec)}
              </span>
            </>
          ) : (
            <>
              <span className={cn(
                'text-3xl font-bold tabular-nums',
                pct > 80 ? 'text-yellow-400' : 'text-white'
              )}>
                {formatTime(minutes, seconds)}
              </span>
              <span className="text-xs text-zinc-500 mt-0.5">remaining</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className={cn(
              'h-1.5 rounded-full transition-all duration-1000',
              isOvertime ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>{estimatedMinutes}min allocated</span>
          <span>{Math.round(elapsed / 60)}min used</span>
        </div>
      </div>

      {/* Time-up modal */}
      {showTimeUp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-lg font-bold text-white mb-1">Time's up!</h3>
            <p className="text-sm text-zinc-400 mb-5">
              Your estimated time has elapsed. What's the status?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setShowTimeUp(false)}
                className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                It's done — mark complete
              </button>
              <button
                onClick={() => {
                  calledTimeUp.current = false
                  setShowTimeUp(false)
                  // Extend by resetting the overtime visual only (timer keeps running)
                }}
                className="w-full px-4 py-3 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Need more time — keep going
              </button>
              <button
                onClick={() => setShowTimeUp(false)}
                className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function useElapsedSeconds(isRunning: boolean, accumulated = 0) {
  const [elapsed, setElapsed] = useState(accumulated)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  return elapsed
}
