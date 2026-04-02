'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ClipboardCheck, Loader2, Sparkles, Flame, TrendingDown } from 'lucide-react'
import { cn, minutesToHM, getCategoryColor, getScoreColor } from '@/lib/utils'

interface Task {
  id: string
  title: string
  category: string
  estimatedMinutes: number
  status: string
  proofText: string | null
  proofUrl: string | null
}

interface DailyPlan {
  id: string
  planDate: string
  status: string
  tasks: Task[]
  evaluation: {
    performanceScore: number
    aiEvaluation: string
    nextDayAdjustments: Array<{ task: string; action: string; reason: string }>
    penaltiesApplied: Array<{ type: string; description: string; impact: string }>
  } | null
}

interface EvalResult {
  evaluation: { id: string }
  aiResult: {
    evaluation: string
    score: number
    completionRate: number
    nextDayAdjustments: Array<{ task: string; action: string; reason: string }>
    penaltiesApplied: Array<{ type: string; description: string; impact: string }>
    streakStatus: string
  }
  newStreak: number
  streakStatus: string
}

export default function EvaluationPage() {
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<EvalResult | null>(null)
  const [history, setHistory] = useState<Array<{
    id: string
    evalDate: string
    performanceScore: number
    aiEvaluation: string
  }>>([])

  async function load() {
    try {
      const [planRes, histRes] = await Promise.all([
        fetch('/api/daily-plan'),
        fetch('/api/evaluation?limit=5')
      ])
      const [planJson, histJson] = await Promise.all([planRes.json(), histRes.json()])
      setDailyPlan(planJson.dailyPlan)
      setHistory(histJson.evaluations ?? [])
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit() {
    if (!dailyPlan) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyPlanId: dailyPlan.id, userNotes: notes })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Submission failed')
        return
      }
      setResult(json)
      await load()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-yellow-400" />
          Daily Evaluation
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Submit your day — AI will evaluate your performance strictly.
        </p>
      </div>

      {/* Fresh eval result */}
      {result && (
        <div className={cn(
          'rounded-2xl border p-6 space-y-4',
          result.aiResult.score >= 70
            ? 'border-green-800/40 bg-green-900/10'
            : 'border-red-800/40 bg-red-900/10'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <span className="font-semibold text-white">AI Evaluation</span>
            </div>
            <span className={cn('text-2xl font-bold', getScoreColor(result.aiResult.score))}>
              {result.aiResult.score}/100
            </span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">{result.aiResult.evaluation}</p>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-zinc-300">
                Streak: <strong className="text-white">{result.newStreak} days</strong>
              </span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                result.streakStatus === 'maintained' ? 'bg-green-500/20 text-green-400' :
                result.streakStatus === 'broken'     ? 'bg-red-500/20 text-red-400' :
                                                       'bg-yellow-500/20 text-yellow-400'
              )}>
                {result.streakStatus}
              </span>
            </div>
            <div className="text-sm text-zinc-500">
              Completion: {result.aiResult.completionRate}%
            </div>
          </div>

          {result.aiResult.nextDayAdjustments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Tomorrow's Adjustments
              </p>
              <div className="space-y-1.5">
                {result.aiResult.nextDayAdjustments.map((adj, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5',
                      adj.action === 'prioritize' ? 'bg-yellow-500/20 text-yellow-400' :
                      adj.action === 'drop'        ? 'bg-red-500/20 text-red-400' :
                                                     'bg-blue-500/20 text-blue-400'
                    )}>
                      {adj.action}
                    </span>
                    <span className="text-zinc-400">
                      <strong className="text-zinc-300">{adj.task}</strong> — {adj.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.aiResult.penaltiesApplied.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Penalties Applied
              </p>
              {result.aiResult.penaltiesApplied.map((p, i) => (
                <div key={i} className="text-xs text-red-300/80 mb-1">
                  <strong>{p.type}:</strong> {p.description} → {p.impact}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing evaluation */}
      {!result && dailyPlan?.evaluation && (
        <div className="glass rounded-2xl p-5 border border-green-800/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-zinc-300">Today's Evaluation</span>
            <span className={cn('text-lg font-bold', getScoreColor(dailyPlan.evaluation.performanceScore))}>
              {dailyPlan.evaluation.performanceScore}/100
            </span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{dailyPlan.evaluation.aiEvaluation}</p>

          {dailyPlan.evaluation.nextDayAdjustments?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-600 mb-1">Tomorrow:</p>
              {dailyPlan.evaluation.nextDayAdjustments.map((adj, i) => (
                <div key={i} className="text-xs text-zinc-500">• {adj.task} → {adj.action}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit form */}
      {!result && dailyPlan && !dailyPlan.evaluation && (
        <div className="space-y-4">
          {/* Task summary */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Today's Tasks Summary</h2>
            <div className="space-y-2">
              {dailyPlan.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800/40 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0',
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'missed'    ? 'bg-red-500'   : 'bg-zinc-600'
                    )} />
                    <span className={cn(
                      'text-sm truncate',
                      task.status === 'completed' ? 'text-zinc-400 line-through' :
                      task.status === 'missed'    ? 'text-red-400/70' : 'text-zinc-300'
                    )}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded border', getCategoryColor(task.category))}>
                      {task.category}
                    </span>
                    <span className={cn(
                      'text-xs font-medium',
                      task.status === 'completed' ? 'text-green-400' :
                      task.status === 'missed'    ? 'text-red-400' : 'text-zinc-500'
                    )}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-semibold text-zinc-300 block mb-2">
              Notes for AI (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context, blockers, or reasons for missed tasks..."
              rows={3}
              maxLength={1000}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-zinc-900 font-semibold rounded-xl py-3.5 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is evaluating your day...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Submit for AI Evaluation
              </>
            )}
          </button>
          <p className="text-xs text-zinc-700 text-center">
            The AI evaluator is strict. Incomplete proofs = lower score. Results are final.
          </p>
        </div>
      )}

      {!dailyPlan && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-zinc-500 text-sm">No tasks scheduled for today.</p>
          <a href="/dashboard/weekly" className="text-yellow-500 text-sm hover:underline mt-2 block">
            Set up your weekly plan first →
          </a>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Recent History</h2>
          {history.map(ev => (
            <div key={ev.id} className="glass rounded-xl p-4 flex items-start gap-4">
              <div className="flex-shrink-0 text-center">
                <span className={cn('text-xl font-bold', getScoreColor(ev.performanceScore))}>
                  {ev.performanceScore}
                </span>
                <div className="text-xs text-zinc-600">/100</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-500 mb-1">
                  {format(new Date(ev.evalDate), 'EEE, MMM do')}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{ev.aiEvaluation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
