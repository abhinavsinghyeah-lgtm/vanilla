'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays } from 'date-fns'
import {
  CalendarDays, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Sparkles, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  category: string
  priority: string
  estimatedMinutes: number
  status: string
}

interface DailyPlan {
  id: string
  planDate: string
  dayIndex: number
  totalMinutesAllocated: number
  status: string
  tasks: Task[]
  evaluation?: { performanceScore: number } | null
}

interface WeeklyPlan {
  id: string
  weekStart: string
  weekEnd: string
  status: string
  goals: string[]
  dailyPlans: DailyPlan[]
}

interface NewTask {
  title: string
  estimatedMinutes: number
  priority: string
  category: string
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } } }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRIORITIES = ['high', 'medium', 'low']
const CATEGORIES = ['output', 'sales', 'improvement']

export default function MobilePlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  // Creation form
  const [goals, setGoals] = useState<string[]>([''])
  const [newTasks, setNewTasks] = useState<NewTask[]>([{ title: '', estimatedMinutes: 30, priority: 'medium', category: 'output' }])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [planMode, setPlanMode] = useState<'full_week' | 'rest_of_week'>('full_week')

  useEffect(() => {
    fetch('/api/weekly-plan')
      .then(r => r.json())
      .then(d => {
        setPlan(d.plan)
        // Set selected day to today's day index (0=Mon, 6=Sun)
        const todayJs = new Date().getDay() // 0=Sun
        const todayIdx = todayJs === 0 ? 6 : todayJs - 1
        // If today has data, select it; otherwise select first day with data
        if (d.plan?.dailyPlans?.find((dp: DailyPlan) => dp.dayIndex === todayIdx)) {
          setSelectedDay(todayIdx)
        } else if (d.plan?.dailyPlans?.length > 0) {
          const sorted = [...d.plan.dailyPlans].sort((a: DailyPlan, b: DailyPlan) => a.dayIndex - b.dayIndex)
          setSelectedDay(sorted[0].dayIndex)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function generatePlan(isUpdate = false) {
    const validGoals = goals.filter(g => g.trim())
    const validTasks = newTasks.filter(t => t.title.trim())
    if (validGoals.length === 0) { setGenError('Add at least one goal'); return }
    if (validTasks.length === 0) { setGenError('Add at least one task'); return }
    setGenError('')
    setGenerating(true)
    try {
      const res = await fetch('/api/weekly-plan', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: validGoals,
          pendingTasks: validTasks.map(t => ({
            title: t.title.trim(),
            estimatedMinutes: Math.max(1, t.estimatedMinutes),
            priority: t.priority,
            category: t.category,
          })),
          mode: planMode,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setGenError(json.error || 'Failed to generate'); return }
      setPlan(json.plan)
      setShowCreate(false)
    } catch {
      setGenError('Network error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-[var(--ml-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  // No plan — show creation
  if (!plan || showCreate) {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
        <motion.div variants={fadeUp} className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--ml-text)]">{plan ? 'Update Plan' : 'Create Plan'}</h1>
          <p className="text-sm text-[var(--ml-text-muted)] mt-1">AI will schedule your tasks</p>
        </motion.div>

        {/* Plan Mode */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--ml-text)] uppercase tracking-wider mb-3">Duration</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPlanMode('full_week')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl border transition-colors ${
                planMode === 'full_week'
                  ? 'bg-[var(--ml-primary)] text-white border-[var(--ml-primary)]'
                  : 'bg-[var(--ml-surface)] text-[var(--ml-text)] border-[var(--ml-border-light)]'
              }`}
            >
              Full Week (7 days)
            </button>
            <button
              onClick={() => setPlanMode('rest_of_week')}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl border transition-colors ${
                planMode === 'rest_of_week'
                  ? 'bg-[var(--ml-primary)] text-white border-[var(--ml-primary)]'
                  : 'bg-[var(--ml-surface)] text-[var(--ml-text)] border-[var(--ml-border-light)]'
              }`}
            >
              Till Sunday
            </button>
          </div>
        </motion.div>

        {/* Goals */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--ml-text)] uppercase tracking-wider mb-3">Goals</h2>
          <div className="space-y-2">
            {goals.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={g}
                  onChange={e => { const copy = [...goals]; copy[i] = e.target.value; setGoals(copy) }}
                  placeholder={`Goal ${i + 1}`}
                  className="flex-1 px-4 py-3 rounded-xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] placeholder:text-[var(--ml-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-primary)]/30"
                />
                {goals.length > 1 && (
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setGoals(goals.filter((_, j) => j !== i))}
                    className="p-3 rounded-xl bg-[var(--ml-danger-bg)] text-[var(--ml-danger)]">
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            ))}
          </div>
          {goals.length < 10 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setGoals([...goals, ''])}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--ml-primary)] px-3 py-2">
              <Plus className="h-4 w-4" /> Add Goal
            </motion.button>
          )}
        </motion.div>

        {/* Tasks */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--ml-text)] uppercase tracking-wider mb-3">Tasks</h2>
          <div className="space-y-3">
            {newTasks.map((t, i) => (
              <TaskFormCard
                key={i}
                task={t}
                index={i}
                onChange={updated => { const copy = [...newTasks]; copy[i] = updated; setNewTasks(copy) }}
                onDelete={newTasks.length > 1 ? () => setNewTasks(newTasks.filter((_, j) => j !== i)) : undefined}
              />
            ))}
          </div>
          {newTasks.length < 30 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setNewTasks([...newTasks, { title: '', estimatedMinutes: 30, priority: 'medium', category: 'output' }])}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--ml-primary)] px-3 py-2">
              <Plus className="h-4 w-4" /> Add Task
            </motion.button>
          )}
        </motion.div>

        {genError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 rounded-xl bg-[var(--ml-danger-bg)] text-[var(--ml-danger)] text-sm">
            {genError}
          </motion.div>
        )}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => generatePlan(!!plan)}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--ml-primary)] to-[#5B4BD5] text-white text-sm font-bold py-4 rounded-2xl shadow-lg shadow-[var(--ml-primary)]/20 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> {plan ? 'Update Plan' : 'Generate Plan'}</>}
        </motion.button>

        {plan && (
          <button onClick={() => setShowCreate(false)} className="w-full mt-3 text-sm text-[var(--ml-text-muted)] font-medium py-2">
            ← Back to plan
          </button>
        )}
      </motion.div>
    )
  }

  // Show existing plan
  const sortedDays = [...plan.dailyPlans].sort((a, b) => a.dayIndex - b.dayIndex)
  const currentDay = sortedDays.find(d => d.dayIndex === selectedDay)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ml-text)]">Weekly Plan</h1>
          <p className="text-sm text-[var(--ml-text-muted)] mt-0.5">
            {format(new Date(plan.weekStart), 'MMM d')} — {format(new Date(plan.weekEnd), 'MMM d')}
          </p>
        </div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => {
          // Pre-fill form from existing plan
          if (plan.goals) setGoals([...(plan.goals as string[]), ''])
          setShowCreate(true)
        }}
          className="px-3 py-2 bg-[var(--ml-primary-bg)] text-[var(--ml-primary)] text-xs font-semibold rounded-xl">
          Update Plan
        </motion.button>
      </motion.div>

      {/* Goals */}
      {plan.goals && (plan.goals as string[]).length > 0 && (
        <motion.div variants={fadeUp} className="mb-6 p-4 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ml-text-muted)] mb-2">Goals</p>
          <div className="space-y-1.5">
            {(plan.goals as string[]).map((g, i) => (
              <p key={i} className="text-sm text-[var(--ml-text)]">• {g}</p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Day Selector */}
      <motion.div variants={fadeUp} className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {DAYS.map((day, i) => {
          const dp = sortedDays.find(d => d.dayIndex === i)
          const isActive = selectedDay === i
          const hasData = !!dp
          const taskCount = dp?.tasks.length ?? 0
          const completedCount = dp?.tasks.filter(t => t.status === 'completed').length ?? 0
          return (
            <motion.button
              key={day}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDay(i)}
              className={`flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-2xl min-w-[52px] transition-colors ${
                isActive
                  ? 'bg-[var(--ml-primary)] text-white shadow-lg shadow-[var(--ml-primary)]/20'
                  : hasData
                  ? 'bg-[var(--ml-surface)] text-[var(--ml-text)]'
                  : 'bg-transparent text-[var(--ml-text-muted)]'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase">{day}</span>
              {hasData ? (
                <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : 'text-[var(--ml-text-muted)]'}`}>{completedCount}/{taskCount}</span>
              ) : (
                <span className="text-[10px]">—</span>
              )}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Selected Day Tasks */}
      {currentDay ? (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--ml-text)]">
              {format(addDays(new Date(plan.weekStart), currentDay.dayIndex), 'EEEE, MMM d')}
            </h2>
            <span className="text-xs text-[var(--ml-text-muted)]">{currentDay.totalMinutesAllocated}m</span>
          </div>
          {currentDay.evaluation && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--ml-success-bg)] text-[var(--ml-success)]">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">Evaluated — Score: {currentDay.evaluation.performanceScore}/100</span>
            </div>
          )}
          <div className="space-y-2.5">
            {currentDay.tasks.map(task => (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border ${
                  task.status === 'completed' ? 'bg-[var(--ml-success-bg)] border-[var(--ml-success)]/20'
                  : task.status === 'missed' ? 'bg-[var(--ml-danger-bg)] border-[var(--ml-danger)]/20'
                  : 'bg-white border-[var(--ml-border-light)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-[var(--ml-success)] shrink-0" />
                  : task.status === 'missed' ? <AlertTriangle className="h-4 w-4 text-[var(--ml-danger)] shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-[var(--ml-border)] shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-[var(--ml-text-muted)]' : 'text-[var(--ml-text)]'}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${catStyle(task.category)}`}>{task.category}</span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priStyle(task.priority)}`}>{task.priority}</span>
                      <span className="text-[11px] text-[var(--ml-text-muted)] flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.estimatedMinutes}m</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {currentDay.tasks.length === 0 && (
              <p className="text-sm text-[var(--ml-text-muted)] text-center py-8">No tasks scheduled</p>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <CalendarDays className="h-10 w-10 text-[var(--ml-border)] mx-auto mb-3" />
          <p className="text-sm text-[var(--ml-text-muted)]">No tasks for {DAYS[selectedDay]}</p>
        </div>
      )}
    </motion.div>
  )
}

function TaskFormCard({ task, index, onChange, onDelete }: { task: NewTask; index: number; onChange: (t: NewTask) => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <div className="rounded-xl border border-[var(--ml-border-light)] bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-sm font-medium text-[var(--ml-text)] flex-1 truncate">{task.title || `Task ${index + 1}`}</span>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--ml-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--ml-text-muted)]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <input
                value={task.title}
                onChange={e => onChange({ ...task, title: e.target.value })}
                placeholder="Task title"
                className="w-full px-3 py-2.5 rounded-lg bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] placeholder:text-[var(--ml-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-primary)]/30"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase text-[var(--ml-text-muted)] mb-1 block">Minutes</label>
                  <input
                    type="number"
                    min={1} max={480}
                    value={task.estimatedMinutes}
                    onChange={e => onChange({ ...task, estimatedMinutes: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-primary)]/30"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase text-[var(--ml-text-muted)] mb-1 block">Priority</label>
                  <select
                    value={task.priority}
                    onChange={e => onChange({ ...task, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] focus:outline-none"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold uppercase text-[var(--ml-text-muted)] mb-1 block">Category</label>
                  <select
                    value={task.category}
                    onChange={e => onChange({ ...task, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] focus:outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {onDelete && (
                <button onClick={onDelete} className="flex items-center gap-1 text-xs text-[var(--ml-danger)] font-medium">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function catStyle(c: string) {
  return c === 'output' ? 'bg-blue-50 text-blue-600' : c === 'sales' ? 'bg-green-50 text-green-600' : c === 'improvement' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-600'
}
function priStyle(p: string) {
  return p === 'high' ? 'bg-red-50 text-red-600' : p === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
}
