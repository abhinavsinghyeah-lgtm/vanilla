'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import StatCard from '@/components/ui/StatCard'
import ProgressBar from '@/components/ui/ProgressBar'
import TaskCard from '@/components/ui/TaskCard'
import AICommandCard from '@/components/dashboard/AICommandCard'
import ScoreCard from '@/components/dashboard/ScoreCard'
import {
  Trophy, Target, Clock, TrendingUp, AlertTriangle, CheckCircle2, Zap
} from 'lucide-react'
import { cn, minutesToHM, getScoreColor } from '@/lib/utils'

interface DashboardData {
  todayPlan: {
    id: string
    totalMinutesAllocated: number
    status: string
    aiReasoning: string | null
    tasks: Array<{
      id: string
      title: string
      category: string
      priority: string
      estimatedMinutes: number
      status: string
      proofText?: string | null
      proofUrl?: string | null
      description?: string | null
    }>
    evaluation: { performanceScore: number; aiEvaluation: string } | null
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
  streak: {
    currentStreak: number
    longestStreak: number
    totalCompletedDays: number
    lastEvaluatedDate: string | null
  } | null
  rewards: Array<{
    id: string
    name: string
    description: string | null
    targetStreak: number
    isUnlocked: boolean
  }>
  weeklyStats: {
    totalDays: number
    evaluatedDays: number
    avgScore: number
    totalTasks: number
    completedTasks: number
  } | null
  scoreHistory: Array<{ evalDate: string; performanceScore: number }>
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Failed to load dashboard')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    await load()
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading dashboard...</div>
    </div>
  )

  if (error) return (
    <div className="text-red-400 text-sm p-4">{error}</div>
  )

  const { todayPlan, todayStats, streak, rewards, weeklyStats, scoreHistory } = data!

  const completionPct = todayStats
    ? Math.round((todayStats.completedTasks / Math.max(todayStats.totalTasks, 1)) * 100)
    : 0

  const timePct = todayStats
    ? Math.round((todayStats.completedMinutes / Math.max(todayStats.totalMinutes, 1)) * 100)
    : 0

  const nextReward = rewards.find(r => !r.isUnlocked)
  const nextRewardProgress = nextReward && streak
    ? Math.round((streak.currentStreak / nextReward.targetStreak) * 100)
    : 0

  const chartData = scoreHistory.map(e => ({
    date: format(new Date(e.evalDate), 'EEE dd'),
    score: e.performanceScore
  }))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Overview</h1>
          <p className="text-sm text-zinc-500">{format(new Date(), "EEEE, MMMM do yyyy")}</p>
        </div>
        {todayStats?.overloaded && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm text-orange-400">
            <AlertTriangle className="h-4 w-4" />
            Overload — tasks exceed 2h limit
          </div>
        )}
      </div>

      {/* AI Command */}
      <AICommandCard />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Streak"
          value={streak?.currentStreak ?? 0}
          sub={`Best: ${streak?.longestStreak ?? 0} days`}
          icon={<Zap className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Tasks Today"
          value={todayStats ? `${todayStats.completedTasks}/${todayStats.totalTasks}` : '—'}
          sub={todayStats?.isEvaluated ? 'Evaluated ✓' : 'Pending evaluation'}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent={completionPct === 100 ? 'green' : 'default'}
        />
        <StatCard
          label="Time Used"
          value={todayStats ? minutesToHM(todayStats.completedMinutes) : '—'}
          sub={`of ${minutesToHM(todayStats?.totalMinutes ?? 0)} allocated`}
          icon={<Clock className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Total Days Done"
          value={streak?.totalCompletedDays ?? 0}
          sub="All-time completed"
          icon={<Target className="h-5 w-5" />}
          accent="purple"
        />
      </div>

      {/* Progress rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's progress */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Today's Progress
          </h2>
          <div className="space-y-3">
            <ProgressBar
              value={completionPct}
              label="Task Completion"
              showValue
              color={completionPct === 100 ? 'green' : 'yellow'}
              size="lg"
            />
            <ProgressBar
              value={timePct}
              label="Time Used"
              showValue
              color="blue"
            />
          </div>
          {todayStats?.overloaded && (
            <div className="mt-3 text-xs text-orange-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              This day exceeds the 2-hour cap
            </div>
          )}
          {!todayPlan && (
            <p className="text-sm text-zinc-600 mt-3">No plan for today. <a href="/dashboard/weekly" className="text-yellow-500 hover:underline">Create a weekly plan →</a></p>
          )}
        </div>

        {/* Score card */}
        <ScoreCard />

        {/* Reward progress */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            Next Reward
          </h2>
          {nextReward ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{nextReward.name}</span>
                <span className="text-xs text-zinc-500">{streak?.currentStreak ?? 0}/{nextReward.targetStreak} days</span>
              </div>
              <ProgressBar value={nextRewardProgress} showValue color="yellow" size="lg" />
              {nextReward.description && (
                <p className="text-xs text-zinc-600 mt-2">{nextReward.description}</p>
              )}
              <div className="mt-3 space-y-1.5">
                {rewards.filter(r => r.isUnlocked).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs text-green-400">
                    <Trophy className="h-3 w-3" />
                    {r.name} ✓
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-yellow-400 font-medium">🏆 All rewards unlocked!</div>
          )}
        </div>
      </div>

      {/* Score chart + weekly summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score chart */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-yellow-400" />
            Performance Score (Last 7 Days)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(24,24,27,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#e4e4e7',
                    fontSize: '12px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ fill: '#eab308', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-sm text-zinc-600">
              No evaluation data yet. Submit your first evaluation to see scores.
            </div>
          )}
        </div>

        {/* Weekly summary */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">This Week</h2>
          {weeklyStats ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Days evaluated</span>
                <span className="text-zinc-300 font-medium">{weeklyStats.evaluatedDays}/{weeklyStats.totalDays}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Avg score</span>
                <span className={cn('font-medium', getScoreColor(weeklyStats.avgScore))}>
                  {weeklyStats.evaluatedDays > 0 ? Math.round(weeklyStats.avgScore) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tasks completed</span>
                <span className="text-zinc-300 font-medium">{weeklyStats.completedTasks}/{weeklyStats.totalTasks}</span>
              </div>
              <ProgressBar
                value={weeklyStats.evaluatedDays}
                max={Math.max(weeklyStats.totalDays, 1)}
                label="Week completion"
                showValue
                size="sm"
                className="mt-2"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">No active weekly plan. <a href="/dashboard/weekly" className="text-yellow-500 hover:underline">Start planning →</a></p>
          )}
        </div>
      </div>

      {/* Today's tasks */}
      {todayPlan && todayPlan.tasks.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-yellow-400" />
            Today's Tasks
            <span className="ml-auto text-xs text-zinc-600">
              {minutesToHM(todayPlan.totalMinutesAllocated)} planned
            </span>
          </h2>
          <div className="space-y-2">
            {todayPlan.tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                interactive={!todayPlan.evaluation}
                onStatusChange={updateTaskStatus}
              />
            ))}
          </div>
          {todayPlan.aiReasoning && (
            <div className="mt-4 px-4 py-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
              <p className="text-xs text-zinc-500 italic">{todayPlan.aiReasoning}</p>
            </div>
          )}
          {!todayPlan.evaluation && (
            <div className="mt-4">
              <a
                href="/dashboard/evaluation"
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
              >
                Submit Today's Evaluation →
              </a>
            </div>
          )}
          {todayPlan.evaluation && (
            <div className="mt-4 p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  Evaluated — Score: {todayPlan.evaluation.performanceScore}/100
                </span>
              </div>
              <p className="text-xs text-zinc-500">{todayPlan.evaluation.aiEvaluation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
