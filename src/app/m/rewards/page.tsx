'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Flame, Trophy, Lock, Unlock, Star, Target, Award,
} from 'lucide-react'

interface Streak {
  currentStreak: number
  longestStreak: number
  totalCompletedDays: number
  lastEvaluatedDate: string | null
}

interface Reward {
  id: string
  name: string
  description: string | null
  targetStreak: number
  isUnlocked: boolean
  unlockedAt: string | null
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } } as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } } }

export default function MobileRewardsPage() {
  const [streak, setStreak] = useState<Streak | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/streaks')
      .then(r => r.json())
      .then(d => {
        setStreak(d.streak)
        setRewards(d.rewards || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-[var(--ml-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  const unlocked = rewards.filter(r => r.isUnlocked)
  const locked = rewards.filter(r => !r.isUnlocked)
  const nextReward = locked.sort((a, b) => a.targetStreak - b.targetStreak)[0]
  const currentStreak = streak?.currentStreak ?? 0
  const nextProgress = nextReward ? Math.min(100, Math.round((currentStreak / nextReward.targetStreak) * 100)) : 100

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--ml-text)]">Rewards</h1>
        <p className="text-sm text-[var(--ml-text-muted)] mt-0.5">Streaks &amp; milestones</p>
      </motion.div>

      {/* Big Streak Card */}
      <motion.div
        variants={fadeUp}
        className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-xl shadow-orange-500/25 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Flame className="h-12 w-12 text-white mx-auto mb-2" strokeWidth={2.5} />
        </motion.div>
        <motion.p
          className="text-6xl font-black text-white tabular-nums"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {currentStreak}
        </motion.p>
        <p className="text-white/80 text-sm font-semibold mt-1">Day Streak</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-8">
        <div className="p-4 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-center">
          <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--ml-text)]">{streak?.longestStreak ?? 0}</p>
          <p className="text-[10px] text-[var(--ml-text-muted)] font-medium">Best Streak</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-center">
          <Target className="h-5 w-5 text-[var(--ml-primary)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--ml-text)]">{streak?.totalCompletedDays ?? 0}</p>
          <p className="text-[10px] text-[var(--ml-text-muted)] font-medium">Total Days</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] text-center">
          <Award className="h-5 w-5 text-[var(--ml-success)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--ml-text)]">{unlocked.length}</p>
          <p className="text-[10px] text-[var(--ml-text-muted)] font-medium">Unlocked</p>
        </div>
      </motion.div>

      {/* Next Reward Progress */}
      {nextReward && (
        <motion.div variants={fadeUp} className="mb-8 p-5 rounded-2xl bg-[var(--ml-primary-bg)] border border-[var(--ml-primary)]/10">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-[var(--ml-primary)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ml-primary)]">Next Reward</span>
          </div>
          <p className="text-base font-semibold text-[var(--ml-text)] mb-1">{nextReward.name}</p>
          {nextReward.description && (
            <p className="text-xs text-[var(--ml-text-secondary)] mb-3">{nextReward.description}</p>
          )}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--ml-text-secondary)]">Progress</span>
            <span className="font-semibold text-[var(--ml-primary)]">{currentStreak} / {nextReward.targetStreak} days</span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[var(--ml-primary)] to-[var(--ml-primary-light)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${nextProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <p className="text-xs text-[var(--ml-text-muted)] mt-2">{nextReward.targetStreak - currentStreak} more days to go</p>
        </motion.div>
      )}

      {/* All Rewards */}
      {rewards.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="text-base font-semibold text-[var(--ml-text)] mb-4">All Rewards</h2>
          <div className="space-y-3">
            {[...rewards].sort((a, b) => a.targetStreak - b.targetStreak).map((reward, i) => {
              const progress = Math.min(100, Math.round((currentStreak / reward.targetStreak) * 100))
              return (
                <motion.div
                  key={reward.id}
                  variants={fadeUp}
                  className={`p-4 rounded-2xl border ${
                    reward.isUnlocked
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-[var(--ml-border-light)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      reward.isUnlocked ? 'bg-amber-100' : 'bg-[var(--ml-surface-alt)]'
                    }`}>
                      {reward.isUnlocked
                        ? <Unlock className="h-5 w-5 text-amber-500" />
                        : <Lock className="h-5 w-5 text-[var(--ml-text-muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${reward.isUnlocked ? 'text-amber-700' : 'text-[var(--ml-text)]'}`}>{reward.name}</p>
                      {reward.description && (
                        <p className="text-xs text-[var(--ml-text-muted)] mt-0.5 truncate">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-[var(--ml-text-muted)] font-medium">{reward.targetStreak}-day streak</span>
                        {reward.isUnlocked && reward.unlockedAt && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            Unlocked {new Date(reward.unlockedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {reward.isUnlocked && <Trophy className="h-5 w-5 text-amber-400 shrink-0" />}
                  </div>
                  {!reward.isUnlocked && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-[var(--ml-surface-alt)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--ml-primary-light)] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* No rewards */}
      {rewards.length === 0 && (
        <motion.div variants={fadeUp} className="text-center py-12">
          <Trophy className="h-12 w-12 text-[var(--ml-border)] mx-auto mb-4" />
          <p className="text-[var(--ml-text-secondary)] text-sm">No rewards yet</p>
          <p className="text-[var(--ml-text-muted)] text-xs mt-1">Keep your streak going to unlock rewards</p>
        </motion.div>
      )}
    </motion.div>
  )
}
