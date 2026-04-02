'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckSquare, Loader2, Clock, Play, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn, minutesToHM, getCategoryColor } from '@/lib/utils'
import dynamic from 'next/dynamic'

const LiveTaskMode = dynamic(() => import('@/components/live/LiveTaskMode'), { ssr: false })

interface Task {
  id: string
  title: string
  category: string
  priority: string
  estimatedMinutes: number
  status: string
  description: string | null
  proofText: string | null
  proofUrl: string | null
  timeSpentMinutes?: number
  carryForwardCount?: number
}

interface DailyPlan {
  id: string
  planDate: string
  dayIndex: number
  totalMinutesAllocated: number
  aiReasoning: string | null
  status: string
  tasks: Task[]
  evaluation: { performanceScore: number; aiEvaluation: string } | null
  weeklyPlan: { goals: string[] }
}

export default function DailyPage() {
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [liveTask, setLiveTask] = useState<Task | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/daily-plan')
      const json = await res.json()
      setDailyPlan(json.dailyPlan)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function resetToPending(taskId: string) {
    setSaving(taskId)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      })
      await load()
    } finally {
      setSaving(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
    </div>
  )

  if (!dailyPlan) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <CheckSquare className="h-8 w-8 text-zinc-700" />
      <p className="text-zinc-500 text-sm">No tasks scheduled for today.</p>
      <a href="/dashboard/weekly" className="text-yellow-500 text-sm hover:underline">
        Create a weekly plan first →
      </a>
    </div>
  )

  const completedMinutes = dailyPlan.tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.estimatedMinutes, 0)

  const completedCount  = dailyPlan.tasks.filter(t => t.status === 'completed').length
  const missedCount     = dailyPlan.tasks.filter(t => t.status === 'missed').length
  const totalCount      = dailyPlan.tasks.length
  const pct             = Math.round((completedCount / Math.max(totalCount, 1)) * 100)
  const isEvaluated     = !!dailyPlan.evaluation

  const categories = ['output', 'sales', 'improvement'] as const
  const byCategory: Record<string, Task[]> = {}
  for (const cat of categories) {
    byCategory[cat] = dailyPlan.tasks.filter(t => t.category === cat)
  }
  const otherTasks = dailyPlan.tasks.filter(t => !categories.includes(t.category as typeof categories[number]))
  if (otherTasks.length > 0) byCategory['other'] = otherTasks

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  for (const key in byCategory) {
    byCategory[key] = [...byCategory[key]].sort((a, b) =>
      (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    )
  }

  const catLabelColors: Record<string, string> = {
    output:      'text-blue-400',
    sales:       'text-green-400',
    improvement: 'text-purple-400',
    other:       'text-zinc-400'
  }

  const priorityStyles: Record<string, string> = {
    high:   'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-yellow-500',
    low:    'border-l-4 border-l-green-500'
  }

  const priorityBadge: Record<string, string> = {
    high:   'text-red-400 bg-red-500/10 border border-red-500/25',
    medium: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/25',
    low:    'text-green-400 bg-green-500/10 border border-green-500/25'
  }

  return (
    <>
      {liveTask && (
        <LiveTaskMode
          task={liveTask}
          onClose={() => { setLiveTask(null); load() }}
          onCompleted={() => { setLiveTask(null); load() }}
          onMissed={() => { setLiveTask(null); load() }}
          onPaused={() => { setLiveTask(null); load() }}
        />
      )}

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-yellow-400" />
            Daily Tasks
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {format(new Date(dailyPlan.planDate.slice(0, 10) + 'T00:00:00'), 'EEEE, MMMM do')}
          </p>
        </div>

        {/* Stats bar */}
        <div className="glass rounded-2xl p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {minutesToHM(completedMinutes)} / {minutesToHM(dailyPlan.totalMinutesAllocated)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">{completedCount}/{totalCount} done · {pct}%</span>
          </div>
          {missedCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400">{missedCount} missed</span>
            </div>
          )}
          <div className="flex-1 min-w-32">
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className={cn('h-1.5 rounded-full transition-all duration-500',
                  pct === 100 ? 'bg-green-500' : 'bg-yellow-500'
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {isEvaluated && (
            <span className="text-xs text-green-400 font-medium bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
              Evaluated: {dailyPlan.evaluation!.performanceScore}/100
            </span>
          )}
        </div>

        {/* AI reasoning */}
        {dailyPlan.aiReasoning && (
          <div className="px-4 py-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
            <p className="text-xs text-zinc-500 italic">
              <span className="text-yellow-500/70 not-italic font-medium">AI Focus: </span>
              {dailyPlan.aiReasoning}
            </p>
          </div>
        )}

        {/* Tasks by category */}
        {Object.entries(byCategory).map(([cat, tasks]) => {
          if (tasks.length === 0) return null
          return (
            <div key={cat}>
              <h2 className={cn('text-xs font-semibold uppercase tracking-widest mb-2', catLabelColors[cat] ?? 'text-zinc-500')}>
                {cat}
              </h2>
              <div className="space-y-2">
                {tasks.map(task => {
                  const isDone       = task.status === 'completed'
                  const isMissed     = task.status === 'missed'
                  const isInProgress = task.status === 'in_progress'
                  const isPending    = task.status === 'pending'
                  return (
                    <div key={task.id} className={cn(
                      'rounded-xl border p-4 transition-all',
                      isDone       ? 'border-green-800/40 bg-green-900/10' :
                      isMissed     ? 'border-red-800/40 bg-red-900/10' :
                      isInProgress ? 'border-yellow-800/40 bg-yellow-900/10' :
                                     'border-zinc-800/50 bg-zinc-900/40',
                      priorityStyles[task.priority]
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium',
                            isDone       ? 'line-through text-zinc-500' :
                            isMissed     ? 'text-red-400/70' :
                            isInProgress ? 'text-yellow-300' :
                                           'text-zinc-100'
                          )}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-zinc-600 mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn('text-xs px-1.5 py-0.5 rounded border', getCategoryColor(task.category))}>
                              {task.category}
                            </span>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', priorityBadge[task.priority])}>
                              {task.priority}
                            </span>
                            <span className="text-xs text-zinc-600">{task.estimatedMinutes}m</span>
                            {(task.carryForwardCount ?? 0) > 0 && (
                              <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
                                ↩ carried {task.carryForwardCount}×
                              </span>
                            )}
                            {isInProgress && (
                              <span className="text-xs text-yellow-400 font-medium flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                In Progress
                              </span>
                            )}
                          </div>
                          {task.proofText && (
                            <p className="text-xs text-zinc-600 mt-1.5 italic border-l-2 border-zinc-700 pl-2">{task.proofText}</p>
                          )}
                          {task.proofUrl && (
                            <a
                              href={task.proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-yellow-500 hover:underline block mt-1"
                            >
                              View proof →
                            </a>
                          )}
                          {task.timeSpentMinutes != null && task.timeSpentMinutes > 0 && (
                            <span className="text-xs text-zinc-600 mt-1 block">
                              Time spent: {minutesToHM(task.timeSpentMinutes)}
                            </span>
                          )}
                        </div>

                        {!isEvaluated && (
                          <div className="flex flex-col gap-1.5 flex-shrink-0">
                            {(isPending || isInProgress) && (
                              <button
                                onClick={() => setLiveTask(task)}
                                disabled={saving === task.id}
                                className={cn(
                                  'text-xs px-3 py-1.5 border rounded-lg transition-colors flex items-center gap-1 font-medium',
                                  isInProgress
                                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                                    : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/25'
                                )}
                              >
                                {saving === task.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Play className="h-3 w-3" />
                                }
                                {isInProgress ? 'Resume' : 'Start'}
                              </button>
                            )}
                            {(isDone || isMissed) && (
                              <button
                                onClick={() => resetToPending(task.id)}
                                disabled={saving === task.id}
                                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
                              >
                                {saving === task.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <RotateCcw className="h-3 w-3" />
                                }
                                Undo
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Evaluation link */}
        {!isEvaluated && completedCount + missedCount === totalCount && totalCount > 0 && (
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <p className="text-sm text-zinc-400">All tasks accounted for. Ready to evaluate?</p>
            <a href="/dashboard/evaluation" className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
              Submit Evaluation →
            </a>
          </div>
        )}

        {isEvaluated && dailyPlan.evaluation && (
          <div className="glass rounded-2xl p-5 border border-green-800/30">
            <p className="text-sm font-semibold text-green-400 mb-2">
              AI Evaluation — {dailyPlan.evaluation.performanceScore}/100
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">{dailyPlan.evaluation.aiEvaluation}</p>
          </div>
        )}
      </div>
    </>
  )
}
