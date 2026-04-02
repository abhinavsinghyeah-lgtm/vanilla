'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateGrade, gradeColor, gradeAccent } from '@/lib/scoring'

interface ScoreData {
  score: DailyScore | null
  message?: string
}

interface DailyScore {
  rawScore: number
  completionPct: number
  proofBonus: number
  priorityBonus: number
  penaltyDeduction: number
  finalScore: number
  grade: string
}

interface ScoreCardProps {
  date?: string
  onScoreLoaded?: (score: number, grade: string) => void
}

export default function ScoreCard({ date, onScoreLoaded }: ScoreCardProps) {
  const [data, setData] = useState<ScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const url = date
          ? `/api/score/calculate?date=${date}`
          : '/api/score/calculate'
        const res = await fetch(url)
        const json = await res.json()
        setData(json)
        if (json.score && onScoreLoaded) {
          onScoreLoaded(json.score.finalScore, json.score.grade)
        }
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [date, onScoreLoaded])

  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 flex items-center justify-center h-36">
        <Loader2 className="h-5 w-5 text-zinc-600 animate-spin" />
      </div>
    )
  }

  if (!data?.score) {
    return (
      <div className="glass rounded-2xl p-5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Today's Score</p>
        <p className="text-sm text-zinc-600">Complete and evaluate tasks to see your score.</p>
      </div>
    )
  }

  const { rawScore, completionPct, proofBonus, priorityBonus, penaltyDeduction, finalScore, grade } = data.score
  const gradeClass = gradeColor(grade)
  const accentClass = gradeAccent(grade)

  return (
    <div className={cn('rounded-2xl p-5 border', accentClass)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Today's Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tabular-nums">{finalScore}</span>
            <span className="text-lg text-zinc-500">/100</span>
          </div>
        </div>
        <div className={cn('text-5xl font-black tabular-nums', gradeClass)}>
          {grade}
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-1.5">
        <ScoreLine label="Base score" value={rawScore} total={100} neutral />
        {completionPct > 0 && (
          <ScoreLine label={`Completion (${completionPct}%)`} value={Math.round(completionPct * 0.6)} total={60} />
        )}
        {proofBonus > 0 && (
          <ScoreLine label="Proof bonus" value={proofBonus} total={15} accent="green" />
        )}
        {priorityBonus > 0 && (
          <ScoreLine label="Priority bonus" value={priorityBonus} total={25} accent="blue" />
        )}
        {penaltyDeduction > 0 && (
          <ScoreLine label="Carry-forward penalty" value={-penaltyDeduction} total={0} accent="red" />
        )}
      </div>
    </div>
  )
}

function ScoreLine({
  label,
  value,
  total,
  neutral = false,
  accent
}: {
  label: string
  value: number
  total: number
  neutral?: boolean
  accent?: 'green' | 'blue' | 'red'
}) {
  const colorMap = {
    green: 'text-green-400',
    blue:  'text-blue-400',
    red:   'text-red-400'
  }
  const textColor = value < 0 ? 'text-red-400' : neutral ? 'text-zinc-400' : accent ? colorMap[accent] : 'text-zinc-300'

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-600">{label}</span>
      <span className={cn('font-medium tabular-nums', textColor)}>
        {value >= 0 ? '+' : ''}{value}{total > 0 ? `/${total}` : ''}
      </span>
    </div>
  )
}
