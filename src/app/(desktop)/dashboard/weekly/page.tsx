'use client'

import { useEffect, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { Plus, Trash2, CalendarRange, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { cn, minutesToHM, getCategoryColor, getPriorityColor } from '@/lib/utils'

interface PendingTask {
  id: string // client-only temp key
  title: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
  category: 'output' | 'sales' | 'improvement'
}

interface WeeklyPlan {
  id: string
  weekStart: string
  weekEnd: string
  status: string
  goals: string[]
  pendingTasks: PendingTask[]
  aiPlan: {
    weekSummary: string
    warnings: string[]
    unscheduledTasks: string[]
  }
  dailyPlans: Array<{
    id: string
    planDate: string
    dayIndex: number
    aiReasoning: string
    totalMinutesAllocated: number
    status: string
    tasks: Array<{
      id: string
      title: string
      category: string
      priority: string
      estimatedMinutes: number
      status: string
      description: string | null
    }>
    evaluation: { performanceScore: number } | null
  }>
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyPage() {
  const [existingPlan, setExistingPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [goals, setGoals] = useState<string[]>([''])
  const [tasks, setTasks] = useState<PendingTask[]>([
    { id: '1', title: '', estimatedMinutes: 30, priority: 'medium', category: 'output' }
  ])

  async function loadPlan() {
    try {
      const res = await fetch('/api/weekly-plan')
      const json = await res.json()
      setExistingPlan(json.plan)
    } catch {
      setError('Failed to load plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlan() }, [])

  function addGoal() {
    if (goals.length < 10) setGoals([...goals, ''])
  }

  function updateGoal(idx: number, val: string) {
    setGoals(goals.map((g, i) => i === idx ? val : g))
  }

  function removeGoal(idx: number) {
    setGoals(goals.filter((_, i) => i !== idx))
  }

  function addTask() {
    if (tasks.length < 30) {
      setTasks([...tasks, {
        id: Date.now().toString(),
        title: '', estimatedMinutes: 30, priority: 'medium', category: 'output'
      }])
    }
  }

  function updateTask(id: string, field: keyof PendingTask, value: string | number) {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t))
  }

  function removeTask(id: string) {
    setTasks(tasks.filter(t => t.id !== id))
  }

  async function handleGenerate() {
    setError('')
    setSuccess('')

    const validGoals = goals.map(g => g.trim()).filter(Boolean)
    const validTasks = tasks.filter(t => t.title.trim())

    if (validGoals.length === 0) { setError('Add at least one goal'); return }
    if (validTasks.length === 0) { setError('Add at least one task'); return }

    setGenerating(true)
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: validGoals, pendingTasks: validTasks })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to generate plan')
        return
      }
      setSuccess('Weekly plan generated successfully!')
      await loadPlan()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
    </div>
  )

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-yellow-400" />
            Weekly Plan
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Week of {format(weekStart, 'MMM do')} – {format(addDays(weekStart, 6), 'MMM do, yyyy')}
          </p>
        </div>
      </div>

      {/* Existing plan view */}
      {existingPlan ? (
        <div className="space-y-4">
          {/* AI Summary */}
          {existingPlan.aiPlan && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-zinc-300 mb-1">AI Weekly Summary</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{existingPlan.aiPlan.weekSummary}</p>
                  {existingPlan.aiPlan.warnings?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {existingPlan.aiPlan.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-orange-400">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                  {existingPlan.aiPlan.unscheduledTasks?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-600 mb-1">Unscheduled (overflow):</p>
                      {existingPlan.aiPlan.unscheduledTasks.map((t, i) => (
                        <span key={i} className="text-xs text-zinc-600 mr-2">• {t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Day-wise plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingPlan.dailyPlans.map(day => {
              const isOver = day.totalMinutesAllocated > 120
              return (
                <div
                  key={day.id}
                  className={cn(
                    'rounded-2xl border p-4',
                    day.evaluation ? 'border-green-800/40 bg-green-900/10' :
                    isOver ? 'border-orange-800/40 bg-orange-900/10' :
                    'border-zinc-800/60 bg-zinc-900/40'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-zinc-200">
                      {DAYS[day.dayIndex]} · {format(new Date(day.planDate), 'MMM d')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs font-medium',
                        isOver ? 'text-orange-400' : 'text-zinc-500'
                      )}>
                        {minutesToHM(day.totalMinutesAllocated)}
                        {isOver && ' ⚠'}
                      </span>
                      {day.evaluation && (
                        <span className="text-xs text-green-400 font-medium">
                          {day.evaluation.performanceScore}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {day.tasks.map(task => (
                      <div key={task.id} className={cn(
                        'px-3 py-2 rounded-xl border text-xs',
                        task.status === 'completed' ? 'border-green-800/30 bg-green-900/10 text-zinc-500 line-through' :
                        task.status === 'missed' ? 'border-red-800/30 bg-red-900/10 text-red-400/70' :
                        'border-zinc-800/40 bg-zinc-900/30'
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-300 font-medium truncate">{task.title}</span>
                          <span className="text-zinc-600 flex-shrink-0">{task.estimatedMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] border', getCategoryColor(task.category))}>
                            {task.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {day.aiReasoning && (
                    <p className="text-xs text-zinc-700 mt-2 italic leading-relaxed">{day.aiReasoning}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Plan generation form */
        <div className="space-y-6">
          {!existingPlan && (
            <div className="glass rounded-2xl p-5 border border-yellow-500/10">
              <p className="text-sm text-zinc-400">
                No plan for this week. Fill in your goals and tasks below, then let AI schedule your week.
              </p>
            </div>
          )}

          {/* Goals */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Weekly Goals</h2>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={goal}
                    onChange={e => updateGoal(idx, e.target.value)}
                    placeholder={`Goal ${idx + 1}...`}
                    maxLength={200}
                    className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40"
                  />
                  {goals.length > 1 && (
                    <button
                      onClick={() => removeGoal(idx)}
                      className="p-2.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addGoal}
                className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-yellow-400 transition-colors mt-1"
              >
                <Plus className="h-4 w-4" />
                Add goal
              </button>
            </div>
          </div>

          {/* Tasks */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Tasks to Schedule</h2>
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    value={task.title}
                    onChange={e => updateTask(task.id, 'title', e.target.value)}
                    placeholder="Task title..."
                    maxLength={200}
                    className="col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  />

                  <select
                    value={task.category}
                    onChange={e => updateTask(task.id, 'category', e.target.value)}
                    className="col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  >
                    <option value="output">Output</option>
                    <option value="sales">Sales</option>
                    <option value="improvement">Improve</option>
                  </select>

                  <select
                    value={task.priority}
                    onChange={e => updateTask(task.id, 'priority', e.target.value)}
                    className="col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <div className="col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      value={task.estimatedMinutes}
                      onChange={e => updateTask(task.id, 'estimatedMinutes', parseInt(e.target.value) || 30)}
                      min={5}
                      max={120}
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                    <span className="text-xs text-zinc-600">m</span>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => removeTask(task.id)}
                      className="p-2.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={addTask}
                className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-yellow-400 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add task
              </button>
            </div>
          </div>

          {/* Errors / success */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold rounded-xl px-6 py-3.5 transition-colors duration-200"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is planning your week...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Weekly Plan with AI
              </>
            )}
          </button>

          <p className="text-xs text-zinc-700 text-center">
            AI will allocate tasks across the week with a maximum of 2 hours per day.
          </p>
        </div>
      )}
    </div>
  )
}
