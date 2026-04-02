'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Pause, CheckCircle2, XCircle, ChevronRight, MessageSquare, Timer } from 'lucide-react'
import { cn, getCategoryColor, getPriorityColor } from '@/lib/utils'
import TaskTimer from './TaskTimer'
import AIChatPanel from './AIChatPanel'

interface LiveTask {
  id: string
  title: string
  description?: string | null
  category: string
  priority: string
  estimatedMinutes: number
  timeSpentMinutes?: number
}

interface LiveTaskModeProps {
  task: LiveTask
  onClose: () => void
  onCompleted: () => void
  onMissed: () => void
  onPaused: () => void
}

type Panel = 'timer' | 'ai'

export default function LiveTaskMode({ task, onClose, onCompleted, onMissed, onPaused }: LiveTaskModeProps) {
  const [started, setStarted] = useState(false)
  const [activePanel, setActivePanel] = useState<Panel>('timer')
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showMissModal, setShowMissModal] = useState(false)
  const [proofText, setProofText] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const elapsedRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)

  // Start task on the server when Live Mode is entered
  useEffect(() => {
    async function startTask() {
      try {
        await fetch(`/api/task/${task.id}/start`, { method: 'POST' })
        setStarted(true)
        startTimeRef.current = Date.now()
      } catch {
        // Silently continue — timer still works
        setStarted(true)
        startTimeRef.current = Date.now()
      }
    }
    startTask()
    // Prevent body scroll while live mode is open
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [task.id])

  function getElapsedMinutes(): number {
    if (!startTimeRef.current) return task.timeSpentMinutes ?? 0
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)
    return elapsed + (task.timeSpentMinutes ?? 0)
  }

  async function handleComplete() {
    setSaving(true)
    try {
      await fetch(`/api/task/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofText: proofText.trim() || undefined,
          proofUrl: proofUrl.trim() || undefined,
          timeSpentMinutes: getElapsedMinutes()
        })
      })
      onCompleted()
    } finally {
      setSaving(false)
    }
  }

  async function handleMiss() {
    setSaving(true)
    try {
      await fetch(`/api/task/${task.id}/miss`, { method: 'POST' })
      onMissed()
    } finally {
      setSaving(false)
    }
  }

  async function handlePause() {
    setSaving(true)
    try {
      await fetch(`/api/task/${task.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpentMinutes: getElapsedMinutes() })
      })
      onPaused()
    } finally {
      setSaving(false)
    }
  }

  const priorityColors: Record<string, string> = {
    high:   'text-red-400 border-red-500/30 bg-red-500/10',
    medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    low:    'text-green-400 border-green-500/30 bg-green-500/10'
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 z-[90] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm flex-shrink-0">
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', getCategoryColor(task.category))}>
              {task.category}
            </span>
            <span className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', priorityColors[task.priority] ?? 'text-zinc-400')}>
              {task.priority}
            </span>
            <span className="text-xs text-zinc-600">{task.estimatedMinutes}min estimated</span>
          </div>
          <h1 className="text-base font-bold text-white truncate">{task.title}</h1>
          {task.description && (
            <p className="text-xs text-zinc-500 mt-0.5 truncate">{task.description}</p>
          )}
        </div>

        {/* Panel toggle */}
        <div className="flex gap-1 bg-zinc-800/60 rounded-xl p-1 border border-zinc-700/40">
          <button
            onClick={() => setActivePanel('timer')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activePanel === 'timer'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Timer className="h-3.5 w-3.5" />
            Timer
          </button>
          <button
            onClick={() => setActivePanel('ai')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activePanel === 'ai'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            AI Assist
          </button>
        </div>

        {/* Exit */}
        <button
          onClick={onClose}
          className="p-2 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
          title="Exit Live Mode (task stays in progress)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {activePanel === 'timer' ? (
          /* Timer view */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-2 text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE — Task in progress
              </div>
            </div>

            {started && (
              <TaskTimer
                estimatedMinutes={task.estimatedMinutes}
                isRunning={!showCompleteModal && !showMissModal && !saving}
                accumulatedSeconds={(task.timeSpentMinutes ?? 0) * 60}
                onTimeUp={() => setTimeUp(true)}
              />
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => setShowCompleteModal(true)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-sm font-semibold rounded-xl transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Task
              </button>
              <button
                onClick={handlePause}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
              <button
                onClick={() => setShowMissModal(true)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400/80 text-sm font-medium rounded-xl transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Mark Missed
              </button>
            </div>

            {timeUp && !showCompleteModal && !showMissModal && (
              <div className="text-xs text-orange-400 flex items-center gap-1.5 animate-pulse">
                ⏰ Time elapsed — ready to complete?
              </div>
            )}

            <button
              onClick={() => setActivePanel('ai')}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              Need help? Open AI Assist
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          /* AI Chat view */
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
            <AIChatPanel
              taskContext={{
                title: task.title,
                description: task.description,
                category: task.category,
                priority: task.priority
              }}
            />
          </div>
        )}
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Mark Complete
            </h3>
            <p className="text-sm text-zinc-500 mb-4">Add proof of work (optional but boosts your score).</p>

            <div className="space-y-3">
              <textarea
                placeholder="What did you produce? Any notes, output, or results..."
                value={proofText}
                onChange={e => setProofText(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-none"
              />
              <input
                type="url"
                placeholder="Proof URL (optional)"
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Confirm Complete'}
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                disabled={saving}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Miss modal */}
      {showMissModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-base font-bold text-white mb-2">Mark as Missed?</h3>
            <p className="text-sm text-zinc-400 mb-5">
              This will carry the task forward to tomorrow with a <span className="text-red-400 font-medium">1.5× penalty</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleMiss}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Yes, Mark Missed'}
              </button>
              <button
                onClick={() => setShowMissModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
