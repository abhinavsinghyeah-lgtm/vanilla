'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Flame, CheckCircle2, Clock, ChevronRight, AlertTriangle,
  CalendarDays, Sparkles, Target, LogOut, Settings,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  status: string
  category: string
  priority: string
  estimatedMinutes: number
}

interface DashboardData {
  todayPlan: {
    id: string
    planDate: string
    tasks: Task[]
    totalMinutesAllocated: number
    evaluation: { performanceScore: number } | null
  } | null
  todayStats: {
    totalTasks: number
    completedTasks: number
    missedTasks: number
    totalMinutes: number
    completedMinutes: number
    isEvaluated: boolean
    overloaded: boolean
  } | null
  streak: { currentStreak: number; longestStreak: number; totalCompletedDays: number } | null
  rewards: Array<{ id: string; name: string; targetStreak: number; isUnlocked: boolean }>
  weeklyStats: { totalTasks: number; completedTasks: number; avgScore: number } | null
  scoreHistory: Array<{ evalDate: string; performanceScore: number }>
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 24 } },
}

export default function MobileDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [aiCommand, setAiCommand] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')

  // Plan-first AI flow
  const [showPlanInput, setShowPlanInput] = useState(false)
  const [userPlan, setUserPlan] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<{ analysis: string; command: string; warnings: string[]; planScore: number } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/ai/command').then(r => r.json()).catch(() => null),
      fetch('/api/auth/me').then(r => r.json()).catch(() => null),
    ]).then(([d, c, me]) => {
      setData(d)
      if (c?.command && c?.cached) setAiCommand(c.command)
      setUsername(me?.username || '')
      setLoading(false)
    })
  }, [])

  async function submitPlan() {
    if (userPlan.trim().length < 10) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/plan-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPlan: userPlan.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        setAiAnalysis(json)
        setAiCommand(json.command)
        setShowPlanInput(false)
      }
    } finally { setAiLoading(false) }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[var(--ml-primary)] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const streak = data?.streak
  const stats = data?.todayStats
  const tasks = data?.todayPlan?.tasks || []
  const completedCount = stats?.completedTasks ?? 0
  const totalCount = stats?.totalTasks ?? tasks.length
  const minutesUsed = stats?.completedMinutes ?? 0
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-24 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[var(--ml-text-muted)] text-sm font-medium">{format(new Date(), 'EEEE, MMM d')}</p>
          <h1 className="text-2xl font-bold text-[var(--ml-text)] mt-1">{greeting}{username ? `, ${username}` : ''}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/m/settings">
            <motion.div whileTap={{ scale: 0.85 }} className="p-2.5 rounded-xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
              <Settings className="h-4 w-4 text-[var(--ml-text-muted)]" />
            </motion.div>
          </Link>
          <motion.button whileTap={{ scale: 0.85 }} onClick={logout} className="p-2.5 rounded-xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
            <LogOut className="h-4 w-4 text-[var(--ml-text-muted)]" />
          </motion.button>
        </div>
      </motion.div>

      {/* AI Plan & Command */}
      {aiAnalysis ? (
        <motion.div variants={fadeUp} className="mb-6">
          {/* Analysis */}
          <div className="p-4 rounded-2xl bg-[var(--ml-primary-bg)] border border-[var(--ml-primary)]/10 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--ml-primary)]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ml-primary)]">AI Analysis</span>
              </div>
              <span className="text-xs font-bold text-[var(--ml-primary)]">{aiAnalysis.planScore}/10</span>
            </div>
            <p className="text-sm text-[var(--ml-text-secondary)] leading-relaxed">{aiAnalysis.analysis}</p>
            {aiAnalysis.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {aiAnalysis.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{w}</p>
                ))}
              </div>
            )}
          </div>
          {/* Command */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--ml-primary)] to-[#5B4BD5] shadow-lg shadow-[var(--ml-primary)]/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-white/80" />
              <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Your Command</span>
            </div>
            <p className="text-white text-[15px] font-medium leading-relaxed">{aiCommand}</p>
          </div>
          <button onClick={() => { setAiAnalysis(null); setShowPlanInput(true); setUserPlan('') }} className="mt-2 w-full text-center text-xs text-[var(--ml-text-muted)] font-medium py-2">
            Write a new plan
          </button>
        </motion.div>
      ) : aiCommand && !showPlanInput ? (
        <motion.div variants={fadeUp} className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[var(--ml-primary)] to-[#5B4BD5] shadow-lg shadow-[var(--ml-primary)]/20">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-white/80" />
            <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Today&apos;s Command</span>
          </div>
          <p className="text-white text-[15px] font-medium leading-relaxed">{aiCommand}</p>
          <button onClick={() => setShowPlanInput(true)} className="mt-3 text-white/60 text-xs font-medium">Update with new plan →</button>
        </motion.div>
      ) : tasks.length > 0 && !showPlanInput ? (
        <motion.div variants={fadeUp} className="mb-6">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowPlanInput(true)}
            className="w-full p-5 rounded-2xl bg-gradient-to-br from-[var(--ml-primary)] to-[#5B4BD5] shadow-lg shadow-[var(--ml-primary)]/20 text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-white/80" />
              <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">Before You Start</span>
            </div>
            <p className="text-white text-[15px] font-medium">Write your plan &amp; roadmap for today →</p>
            <p className="text-white/60 text-xs mt-1">AI will analyze and give you a personalized command</p>
          </motion.button>
        </motion.div>
      ) : null}

      {/* Plan Input Form */}
      <AnimatePresence>
        {showPlanInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="mb-6 p-5 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--ml-primary)]" />
              <span className="text-sm font-semibold text-[var(--ml-text)]">What&apos;s your plan for today?</span>
            </div>
            <p className="text-xs text-[var(--ml-text-muted)] mb-3">Describe your roadmap, approach, and priorities. AI will analyze and generate a command.</p>
            <textarea
              value={userPlan}
              onChange={e => setUserPlan(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. First I'll call top 5 leads to push for closes. Then spend 30min on the landing page copy. After that, review and adjust my sales pipeline..."
              className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--ml-border-light)] text-sm text-[var(--ml-text)] placeholder:text-[var(--ml-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ml-primary)]/30 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-[var(--ml-text-muted)]">{userPlan.length}/2000</span>
              <div className="flex gap-2">
                <button onClick={() => setShowPlanInput(false)} className="px-4 py-2 text-xs text-[var(--ml-text-muted)] font-medium">Cancel</button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={submitPlan}
                  disabled={aiLoading || userPlan.trim().length < 10}
                  className="px-5 py-2 bg-[var(--ml-primary)] text-white text-xs font-bold rounded-xl disabled:opacity-40"
                >
                  {aiLoading ? 'Analyzing...' : 'Get AI Command'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-orange-50 flex flex-col items-center gap-1">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-xl font-bold text-orange-500">{streak?.currentStreak ?? 0}</span>
          <span className="text-[11px] text-[var(--ml-text-muted)] font-medium">Streak</span>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ml-success-bg)] flex flex-col items-center gap-1">
          <CheckCircle2 className="h-5 w-5 text-[var(--ml-success)]" />
          <span className="text-xl font-bold text-[var(--ml-success)]">{completedCount}</span>
          <span className="text-[11px] text-[var(--ml-text-muted)] font-medium">of {totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ml-primary-bg)] flex flex-col items-center gap-1">
          <Clock className="h-5 w-5 text-[var(--ml-primary)]" />
          <span className="text-xl font-bold text-[var(--ml-primary)]">{minutesUsed}</span>
          <span className="text-[11px] text-[var(--ml-text-muted)] font-medium">min used</span>
        </div>
      </motion.div>

      {/* Today's Progress */}
      {totalCount > 0 && (
        <motion.div variants={fadeUp} className="mb-6 p-5 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--ml-text)]">Today&apos;s Progress</span>
            <span className="text-sm font-bold text-[var(--ml-primary)]">{pct}%</span>
          </div>
          <div className="h-2.5 bg-[var(--ml-surface-alt)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--ml-primary)] to-[var(--ml-primary-light)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Weekly Stats */}
      {data?.weeklyStats && (
        <motion.div variants={fadeUp} className="mb-6 p-5 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="h-4 w-4 text-[var(--ml-text-muted)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ml-text-muted)]">This Week</span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-[var(--ml-text)]">{data.weeklyStats.completedTasks}</span>
            <span className="text-sm text-[var(--ml-text-secondary)]">/ {data.weeklyStats.totalTasks} tasks</span>
            <span className="ml-auto text-sm font-semibold text-[var(--ml-primary)]">{data.weeklyStats.totalTasks > 0 ? Math.round((data.weeklyStats.completedTasks / data.weeklyStats.totalTasks) * 100) : 0}%</span>
          </div>
        </motion.div>
      )}

      {/* Today's Tasks */}
      {tasks.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--ml-text)]">Today&apos;s Tasks</h2>
            <Link href="/m/daily" className="flex items-center gap-1 text-sm font-medium text-[var(--ml-primary)]">
              See all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 4).map((task) => (
              <motion.div
                key={task.id}
                variants={fadeUp}
                className="p-4 rounded-2xl bg-white border border-[var(--ml-border-light)] shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    task.status === 'completed' ? 'bg-[var(--ml-success)]'
                    : task.status === 'missed' ? 'bg-[var(--ml-danger)]'
                    : task.status === 'in_progress' ? 'bg-[var(--ml-primary)] animate-pulse'
                    : 'bg-[var(--ml-border)]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-[var(--ml-text-muted)]' : 'text-[var(--ml-text)]'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${catStyle(task.category)}`}>{task.category}</span>
                      <span className="text-[11px] text-[var(--ml-text-muted)]">{task.estimatedMinutes}m</span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${priStyle(task.priority)}`}>{task.priority}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty */}
      {tasks.length === 0 && (
        <motion.div variants={fadeUp} className="text-center py-16">
          <Target className="h-12 w-12 text-[var(--ml-border)] mx-auto mb-4" />
          <p className="text-[var(--ml-text-secondary)] text-sm mb-4">No tasks for today</p>
          <Link href="/m/plan" className="inline-block px-6 py-2.5 bg-[var(--ml-primary)] text-white text-sm font-semibold rounded-xl">
            Create a Plan
          </Link>
        </motion.div>
      )}
    </motion.div>
  )
}

function catStyle(c: string) {
  return c === 'output' ? 'bg-blue-50 text-blue-600'
    : c === 'sales' ? 'bg-green-50 text-green-600'
    : c === 'improvement' ? 'bg-purple-50 text-purple-600'
    : 'bg-gray-50 text-gray-600'
}
function priStyle(p: string) {
  return p === 'high' ? 'bg-red-50 text-red-600'
    : p === 'medium' ? 'bg-amber-50 text-amber-600'
    : 'bg-gray-50 text-gray-500'
}
