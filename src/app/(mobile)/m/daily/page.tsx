'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  CheckCircle2, XCircle, Play, Pause, Clock,
  AlertTriangle, Loader2, Sparkles, ArrowRight, Check,
} from 'lucide-react'

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
  startedAt?: string
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

interface EvalResult {
  score: number
  aiEvaluation: string
  newStreak: number
  grade: string
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } } }

const STATUS_ORDER: Record<string, number> = { in_progress: 0, pending: 1, completed: 2, missed: 3, postponed: 4 }

export default function MobileDailyPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Manual completion modal
  const [manualTask, setManualTask] = useState<Task | null>(null)
  const [manualTimeMode, setManualTimeMode] = useState<'allocated' | 'less' | 'more'>('allocated')
  const [manualMinutes, setManualMinutes] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-plan')
      const json = await res.json()
      setPlan(json.dailyPlan)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Live timer for active task
  const activeTask = plan?.tasks.find(t => t.status === 'in_progress')
  useEffect(() => {
    if (!activeTask) { setElapsed(0); return }
    const priorMs = (activeTask.timeSpentMinutes || 0) * 60000
    const startMs = activeTask.startedAt ? new Date(activeTask.startedAt).getTime() : Date.now()
    const tick = () => setElapsed(priorMs + Date.now() - startMs)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activeTask?.id, activeTask?.status, activeTask?.startedAt, activeTask?.timeSpentMinutes])

  async function act(taskId: string, action: 'start' | 'complete' | 'miss' | 'pause') {
    setActing(taskId)
    try {
      const url = action === 'start' ? `/api/task/${taskId}/start`
        : action === 'complete' ? `/api/task/${taskId}/complete`
        : action === 'miss' ? `/api/task/${taskId}/miss`
        : `/api/task/${taskId}/pause`
      const body = action === 'pause' ? JSON.stringify({ elapsedMinutes: Math.floor(elapsed / 60000) }) : undefined
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      await load()
    } finally { setActing(null) }
  }

  async function completeManual() {
    if (!manualTask) return
    const timeSpent = manualTimeMode === 'allocated' ? manualTask.estimatedMinutes
      : manualMinutes
    setActing(manualTask.id)
    try {
      await fetch(`/api/task/${manualTask.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpentMinutes: Math.max(timeSpent, 1) }),
      })
      setManualTask(null)
      await load()
    } finally { setActing(null) }
  }

  function openManualComplete(task: Task) {
    setManualTask(task)
    setManualTimeMode('allocated')
    setManualMinutes(task.estimatedMinutes)
  }

  async function evaluateDay() {
    if (!plan) return
    setEvaluating(true)
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyPlanId: plan.id }),
      })
      const json = await res.json()
      if (json.aiResult) {
        setEvalResult({
          score: json.aiResult.score,
          aiEvaluation: json.aiResult.evaluation,
          newStreak: json.newStreak ?? 0,
          grade: json.aiResult.grade || (json.aiResult.score >= 90 ? 'A' : json.aiResult.score >= 70 ? 'B' : json.aiResult.score >= 50 ? 'C' : 'F'),
        })
      }
      await load()
    } finally { setEvaluating(false) }
  }

  const fmtTimer = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const pad = (n: number) => String(n).padStart(2, '0')
    return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-[var(--ml-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-4">
        <CheckCircle2 className="h-12 w-12 text-[var(--ml-border)]" />
        <p className="text-[var(--ml-text-secondary)] text-sm">No tasks scheduled for today.</p>
        <a href="/m/plan" className="px-6 py-2.5 bg-[var(--ml-primary)] text-white text-sm font-semibold rounded-xl">Create a Plan</a>
      </div>
    )
  }

  const tasks = plan.tasks
  const sorted = [...tasks].sort((a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5))
  const completed = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const canEvaluate = !plan.evaluation && tasks.every(t => t.status === 'completed' || t.status === 'missed')

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-6">
        <p className="text-[var(--ml-text-muted)] text-sm font-medium">{format(new Date(plan.planDate), 'EEEE')}</p>
        <h1 className="text-2xl font-bold text-[var(--ml-text)] mt-0.5">{format(new Date(plan.planDate), 'MMMM d, yyyy')}</h1>
      </motion.div>

      {/* Progress */}
      <motion.div variants={fadeUp} className="mb-6 p-5 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--ml-text)]">{completed} of {total} completed</span>
          <span className="text-sm font-bold text-[var(--ml-primary)]">{pct}%</span>
        </div>
        <div className="h-2.5 bg-[var(--ml-surface-alt)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--ml-primary)] to-[var(--ml-primary-light)] rounded-full"
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        </div>
        <p className="text-[11px] text-[var(--ml-text-muted)] mt-2">{plan.totalMinutesAllocated}m allocated today</p>
      </motion.div>

      {/* Active Task Banner */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[var(--ml-primary)] to-[#5B4BD5] shadow-lg shadow-[var(--ml-primary)]/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">In Progress</span>
            </div>
            <p className="text-white font-semibold text-base mb-3">{activeTask.title}</p>
            <p className="text-white/90 text-2xl font-mono font-bold mb-4 tabular-nums">{fmtTimer(elapsed)}</p>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => act(activeTask.id, 'complete')} disabled={acting === activeTask.id}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Done
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => act(activeTask.id, 'pause')} disabled={acting === activeTask.id}
                className="flex items-center justify-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
                <Pause className="h-4 w-4" />
              </motion.button>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => act(activeTask.id, 'miss')} disabled={acting === activeTask.id}
                className="flex items-center justify-center gap-1.5 bg-red-500/30 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
                <XCircle className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evaluation Result */}
      <AnimatePresence>
        {evalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 p-5 rounded-2xl bg-[var(--ml-success-bg)] border border-[var(--ml-success)]/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--ml-success)]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ml-success)]">Evaluation Complete</span>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className={`text-4xl font-bold ${evalResult.score >= 70 ? 'text-[var(--ml-success)]' : 'text-[var(--ml-danger)]'}`}>{evalResult.score}</span>
              <span className="text-sm text-[var(--ml-text-secondary)]">/ 100</span>
              <span className={`ml-auto text-2xl font-bold ${gradeColor(evalResult.grade)}`}>{evalResult.grade}</span>
            </div>
            <p className="text-sm text-[var(--ml-text-secondary)] leading-relaxed">{evalResult.aiEvaluation}</p>
            {evalResult.newStreak > 0 && (
              <p className="text-sm font-semibold text-orange-600 mt-3">🔥 Streak: {evalResult.newStreak} days</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Already evaluated */}
      {plan.evaluation && !evalResult && (
        <motion.div variants={fadeUp} className="mb-6 p-4 rounded-2xl bg-[var(--ml-success-bg)] border border-[var(--ml-success)]/20 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[var(--ml-success)] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--ml-text)]">Day Evaluated</p>
            <p className="text-xs text-[var(--ml-text-secondary)]">Score: {plan.evaluation.performanceScore}/100</p>
          </div>
        </motion.div>
      )}

      {/* Task List */}
      <motion.div variants={fadeUp} className="mb-6">
        <h2 className="text-base font-semibold text-[var(--ml-text)] mb-4">Tasks</h2>
        <div className="space-y-3">
          <AnimatePresence>
            {sorted.map(task => (
              <motion.div
                key={task.id}
                layout
                variants={fadeUp}
                className={`p-4 rounded-2xl border shadow-sm transition-colors ${
                  task.status === 'completed' ? 'bg-[var(--ml-success-bg)] border-[var(--ml-success)]/20'
                  : task.status === 'missed' ? 'bg-[var(--ml-danger-bg)] border-[var(--ml-danger)]/20'
                  : task.status === 'in_progress' ? 'bg-[var(--ml-primary-bg)] border-[var(--ml-primary)]/20'
                  : 'bg-white border-[var(--ml-border-light)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-[var(--ml-success)]" />
                    : task.status === 'missed' ? <XCircle className="h-5 w-5 text-[var(--ml-danger)]" />
                    : task.status === 'in_progress' ? <Play className="h-5 w-5 text-[var(--ml-primary)] fill-current" />
                    : <div className="w-5 h-5 rounded-full border-2 border-[var(--ml-border)]" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-[var(--ml-text-muted)]' : 'text-[var(--ml-text)]'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-[var(--ml-text-muted)] mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${catStyle(task.category)}`}>{task.category}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${priStyle(task.priority)}`}>{task.priority}</span>
                      <span className="text-[11px] text-[var(--ml-text-muted)] flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.estimatedMinutes}m</span>
                      {(task.carryForwardCount ?? 0) > 0 && (
                        <span className="text-[10px] text-orange-600 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />CF×{task.carryForwardCount}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {task.status === 'pending' && !activeTask && (
                  <div className="mt-3 flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => act(task.id, 'start')}
                      disabled={acting === task.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-[var(--ml-primary)] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
                    >
                      {acting === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Start</>}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => openManualComplete(task)}
                      className="flex items-center justify-center gap-1.5 bg-[var(--ml-success)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
                    >
                      <Check className="h-4 w-4" /> Done
                    </motion.button>
                  </div>
                )}
                {task.status === 'pending' && activeTask && (
                  <p className="mt-2 text-[11px] text-[var(--ml-text-muted)] italic">Complete the active task first</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Manual Complete Modal */}
      <AnimatePresence>
        {manualTask && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setManualTask(null)}
          >
            <motion.div
              initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-base font-bold text-[var(--ml-text)] mb-1">Complete: {manualTask.title}</h3>
              <p className="text-xs text-[var(--ml-text-muted)] mb-4">Allocated: {manualTask.estimatedMinutes}m — How much time did you actually use?</p>

              <div className="flex gap-2 mb-4">
                {(['allocated', 'less', 'more'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setManualTimeMode(m)
                      if (m === 'allocated') setManualMinutes(manualTask.estimatedMinutes)
                      else if (m === 'less') setManualMinutes(Math.round(manualTask.estimatedMinutes / 2))
                      else setManualMinutes(manualTask.estimatedMinutes + 15)
                    }}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${
                      manualTimeMode === m
                        ? 'bg-[var(--ml-primary)] text-white border-[var(--ml-primary)]'
                        : 'bg-[var(--ml-surface)] text-[var(--ml-text)] border-[var(--ml-border-light)]'
                    }`}
                  >
                    {m === 'allocated' ? `${manualTask.estimatedMinutes}m` : m === 'less' ? 'Less' : 'More'}
                  </button>
                ))}
              </div>

              {manualTimeMode !== 'allocated' && (
                <div className="mb-4">
                  <label className="text-[10px] font-semibold uppercase text-[var(--ml-text-muted)] mb-1 block">Actual minutes</label>
                  <input
                    type="number"
                    min={1} max={480}
                    value={manualMinutes}
                    onChange={e => setManualMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-primary)]/30"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setManualTask(null)} className="flex-1 py-3 text-sm font-medium text-[var(--ml-text-muted)] rounded-xl bg-[var(--ml-surface)]">Cancel</button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={completeManual}
                  disabled={acting === manualTask.id}
                  className="flex-1 py-3 text-sm font-bold text-white rounded-xl bg-[var(--ml-success)] disabled:opacity-50"
                >
                  {acting === manualTask.id ? 'Saving...' : 'Mark Complete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evaluate Day */}
      {canEvaluate && (
        <motion.div variants={fadeUp} className="mb-6">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={evaluateDay}
            disabled={evaluating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--ml-primary)] to-[#5B4BD5] text-white text-sm font-bold py-4 rounded-2xl shadow-lg shadow-[var(--ml-primary)]/20 disabled:opacity-50"
          >
            {evaluating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Evaluate Day <ArrowRight className="h-4 w-4" /></>}
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  )
}

function catStyle(c: string) {
  return c === 'output' ? 'bg-blue-50 text-blue-600' : c === 'sales' ? 'bg-green-50 text-green-600' : c === 'improvement' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'
}
function priStyle(p: string) {
  return p === 'high' ? 'bg-red-50 text-red-600' : p === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
}
function gradeColor(g: string) {
  return g === 'A' ? 'text-[var(--ml-success)]' : g === 'B' ? 'text-[var(--ml-primary)]' : g === 'C' ? 'text-amber-500' : 'text-[var(--ml-danger)]'
}
