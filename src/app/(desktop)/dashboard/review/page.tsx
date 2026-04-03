'use client'

import { useEffect, useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { Loader2, BarChart3, RefreshCw, TrendingDown, TrendingUp, Lightbulb, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { calculateGrade, gradeColor, gradeAccent } from '@/lib/scoring'

interface WeeklyReview {
  id: string
  weekStart: string
  weekEnd: string
  weeklyScore: number
  grade: string
  whatWorked: string
  whatFailed: string
  whatToImprove: string
  aiSummary: string
  createdAt: string
}

interface ReviewHistory {
  reviews: WeeklyReview[]
  current: WeeklyReview | null
}

export default function WeeklyReviewPage() {
  const [data, setData] = useState<ReviewHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    try {
      const res = await fetch('/api/review/weekly')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load review data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/review/weekly', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to generate review')
      } else {
        await load()
      }
    } catch {
      setError('Failed to generate review')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-zinc-500 text-sm animate-pulse">Loading review data...</div>
    </div>
  )

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-yellow-400" />
            Weekly Review
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            AI-generated performance analysis
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          {generating
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />
          }
          {generating ? 'Generating...' : 'Generate This Week'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {(!data?.current && !data?.reviews?.length) && !generating && (
        <div className="glass rounded-2xl p-8 text-center">
          <BarChart3 className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-400 mb-2">No reviews yet</h3>
          <p className="text-sm text-zinc-600 mb-5">
            Complete at least one daily evaluation this week, then generate your review.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="px-5 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
          >
            Generate First Review
          </button>
        </div>
      )}

      {/* This week's review */}
      {data?.current && (
        <ReviewCard review={data.current} isCurrent />
      )}

      {/* Past reviews */}
      {data?.reviews && data.reviews.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">Previous Weeks</h2>
          <div className="space-y-4">
            {data.reviews
              .filter(r => r.id !== data.current?.id)
              .map(review => (
                <ReviewCard key={review.id} review={review} />
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review, isCurrent = false }: { review: WeeklyReview; isCurrent?: boolean }) {
  const [expanded, setExpanded] = useState(isCurrent)
  const grade = review.grade ?? calculateGrade(review.weeklyScore)
  const gradeClass = gradeColor(grade)
  const accentClass = gradeAccent(grade)

  return (
    <div className={cn('rounded-2xl border p-5 transition-all', accentClass)}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          {isCurrent && (
            <span className="text-xs text-yellow-400 font-medium bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
              This Week
            </span>
          )}
          <span className="text-sm font-semibold text-zinc-300">
            Week of {format(new Date(review.weekStart.slice(0, 10) + 'T00:00:00'), 'MMM d')} – {format(new Date(review.weekEnd.slice(0, 10) + 'T00:00:00'), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-zinc-400 tabular-nums">{review.weeklyScore}/100</span>
          <span className={cn('text-2xl font-black tabular-nums', gradeClass)}>{grade}</span>
          <span className="text-xs text-zinc-600">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-5 space-y-4">
          {/* AI Summary */}
          <div className="px-4 py-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Summary</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{review.aiSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* What worked */}
            <div className="px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">What Worked</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{review.whatWorked}</p>
            </div>

            {/* What failed */}
            <div className="px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">What Failed</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{review.whatFailed}</p>
            </div>

            {/* What to improve */}
            <div className="px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Next Week</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{review.whatToImprove}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
