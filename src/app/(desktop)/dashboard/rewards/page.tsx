'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Trophy, Lock, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Reward {
  id: string
  name: string
  description: string | null
  targetStreak: number
  isUnlocked: boolean
  unlockedAt: string | null
}

interface Streak {
  currentStreak: number
  longestStreak: number
  totalCompletedDays: number
  lastEvaluatedDate: string | null
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [streak, setStreak] = useState<Streak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/streaks')
      .then(r => r.json())
      .then(d => {
        setRewards(d.rewards ?? [])
        setStreak(d.streak)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading...</div>
    </div>
  )

  const unlockedCount = rewards.filter(r => r.isUnlocked).length
  const nextReward = rewards.find(r => !r.isUnlocked)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Rewards
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Streak milestones and unlockable achievements.</p>
      </div>

      {/* Streak stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400 mb-0.5">{streak?.currentStreak ?? 0}</div>
          <div className="text-xs text-zinc-500">Current Streak</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-white mb-0.5">{streak?.longestStreak ?? 0}</div>
          <div className="text-xs text-zinc-500">Best Streak</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-white mb-0.5">{unlockedCount}/{rewards.length}</div>
          <div className="text-xs text-zinc-500">Rewards Unlocked</div>
        </div>
      </div>

      {/* Next reward progress */}
      {nextReward && streak && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-semibold text-zinc-300">Next Reward</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-bold text-white">{nextReward.name}</span>
            <span className="text-sm text-zinc-400">
              {streak.currentStreak}/{nextReward.targetStreak} days
            </span>
          </div>
          {nextReward.description && (
            <p className="text-xs text-zinc-600 mb-3">{nextReward.description}</p>
          )}
          <div className="w-full bg-zinc-800 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-yellow-500 transition-all duration-500 relative overflow-hidden"
              style={{ width: `${Math.min((streak.currentStreak / nextReward.targetStreak) * 100, 100)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="mt-2 text-xs text-zinc-600 text-right">
            {Math.max(nextReward.targetStreak - streak.currentStreak, 0)} days remaining
          </div>
        </div>
      )}

      {/* All rewards */}
      <div className="space-y-3">
        {rewards.map(reward => {
          const progress = streak
            ? Math.min((streak.currentStreak / reward.targetStreak) * 100, 100)
            : 0

          return (
            <div
              key={reward.id}
              className={cn(
                'rounded-2xl border p-5 transition-all',
                reward.isUnlocked
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-zinc-800/60 bg-zinc-900/40'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  reward.isUnlocked
                    ? 'bg-yellow-500/20 border border-yellow-500/30'
                    : 'bg-zinc-800/60 border border-zinc-700/40'
                )}>
                  {reward.isUnlocked
                    ? <Trophy className="h-6 w-6 text-yellow-400" />
                    : <Lock className="h-5 w-5 text-zinc-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={cn(
                      'font-semibold',
                      reward.isUnlocked ? 'text-yellow-400' : 'text-zinc-300'
                    )}>
                      {reward.name}
                    </span>
                    <span className="text-xs text-zinc-600">{reward.targetStreak} day streak</span>
                  </div>

                  {reward.description && (
                    <p className={cn(
                      'text-xs mt-0.5',
                      reward.isUnlocked ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      {reward.description}
                    </p>
                  )}

                  {reward.isUnlocked && reward.unlockedAt ? (
                    <p className="text-xs text-yellow-500/60 mt-1.5">
                      Unlocked {format(new Date(reward.unlockedAt), 'MMM do, yyyy')}
                    </p>
                  ) : (
                    <div className="mt-2.5">
                      <div className="w-full bg-zinc-800 rounded-full h-1">
                        <div
                          className="h-1 rounded-full bg-zinc-600 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {rewards.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-zinc-600 text-sm">No rewards configured.</p>
        </div>
      )}
    </div>
  )
}
