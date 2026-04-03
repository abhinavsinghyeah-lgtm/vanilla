'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  BarChart3, Loader2, Sparkles, TrendingUp, TrendingDown,
  Lightbulb, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'

interface Review {
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

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } } as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } } }

export default function MobileReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [current, setCurrent] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/review/weekly')
      const json = await res.json()
      setReviews(json.reviews || [])
      setCurrent(json.current || null)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/review/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) await load()
    } finally { setGenerating(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-8 h-8 border-2 border-[var(--ml-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--ml-text)]">Weekly Review</h1>
        <p className="text-sm text-[var(--ml-text-muted)] mt-0.5">AI-powered performance analysis</p>
      </motion.div>

      {/* Generate Button */}
      {!current && (
        <motion.div variants={fadeUp} className="mb-6">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={generate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--ml-primary)] to-[#5B4BD5] text-white text-sm font-bold py-4 rounded-2xl shadow-lg shadow-[var(--ml-primary)]/20 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Generate This Week&apos;s Review</>}
          </motion.button>
        </motion.div>
      )}

      {/* Current Week Review */}
      {current && (
        <motion.div variants={fadeUp} className="mb-8">
          <div className="p-5 rounded-2xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)] mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ml-text-muted)]">This Week</span>
              <span className="text-xs text-[var(--ml-text-muted)]">
                {format(new Date(current.weekStart), 'MMM d')} — {format(new Date(current.weekEnd), 'MMM d')}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className={`text-5xl font-bold ${current.weeklyScore >= 70 ? 'text-[var(--ml-success)]' : current.weeklyScore >= 50 ? 'text-amber-500' : 'text-[var(--ml-danger)]'}`}>
                {current.weeklyScore}
              </span>
              <span className="text-lg text-[var(--ml-text-secondary)]">/ 100</span>
              <span className={`ml-auto text-3xl font-bold ${gradeColor(current.grade)}`}>{current.grade}</span>
            </div>
          </div>

          {/* Insights Cards */}
          {current.whatWorked && (
            <InsightCard icon={<TrendingUp className="h-4 w-4" />} label="What Worked" text={current.whatWorked} color="text-[var(--ml-success)]" bg="bg-[var(--ml-success-bg)]" />
          )}
          {current.whatFailed && (
            <InsightCard icon={<TrendingDown className="h-4 w-4" />} label="What Failed" text={current.whatFailed} color="text-[var(--ml-danger)]" bg="bg-[var(--ml-danger-bg)]" />
          )}
          {current.whatToImprove && (
            <InsightCard icon={<Lightbulb className="h-4 w-4" />} label="What to Improve" text={current.whatToImprove} color="text-[var(--ml-primary)]" bg="bg-[var(--ml-primary-bg)]" />
          )}
          {current.aiSummary && (
            <InsightCard icon={<Sparkles className="h-4 w-4" />} label="AI Summary" text={current.aiSummary} color="text-amber-600" bg="bg-amber-50" />
          )}
        </motion.div>
      )}

      {/* Previous Reviews */}
      {reviews.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="text-base font-semibold text-[var(--ml-text)] mb-4">Previous Reviews</h2>
          <div className="space-y-3">
            {reviews.filter(r => r.id !== current?.id).map(review => (
              <motion.div
                key={review.id}
                variants={fadeUp}
                className="rounded-2xl border border-[var(--ml-border-light)] bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === review.id ? null : review.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--ml-text)]">
                      {format(new Date(review.weekStart), 'MMM d')} — {format(new Date(review.weekEnd), 'MMM d')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-lg font-bold ${review.weeklyScore >= 70 ? 'text-[var(--ml-success)]' : review.weeklyScore >= 50 ? 'text-amber-500' : 'text-[var(--ml-danger)]'}`}>
                        {review.weeklyScore}
                      </span>
                      <span className={`text-sm font-bold ${gradeColor(review.grade)}`}>{review.grade}</span>
                    </div>
                  </div>
                  {expanded === review.id ? <ChevronUp className="h-4 w-4 text-[var(--ml-text-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--ml-text-muted)]" />}
                </button>
                {expanded === review.id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 space-y-3 border-t border-[var(--ml-border-light)] pt-3">
                    {review.whatWorked && <p className="text-xs text-[var(--ml-text-secondary)]"><strong className="text-[var(--ml-success)]">Worked:</strong> {review.whatWorked}</p>}
                    {review.whatFailed && <p className="text-xs text-[var(--ml-text-secondary)]"><strong className="text-[var(--ml-danger)]">Failed:</strong> {review.whatFailed}</p>}
                    {review.whatToImprove && <p className="text-xs text-[var(--ml-text-secondary)]"><strong className="text-[var(--ml-primary)]">Improve:</strong> {review.whatToImprove}</p>}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty */}
      {reviews.length === 0 && !current && (
        <motion.div variants={fadeUp} className="text-center py-16">
          <BarChart3 className="h-12 w-12 text-[var(--ml-border)] mx-auto mb-4" />
          <p className="text-[var(--ml-text-secondary)] text-sm">No reviews yet</p>
          <p className="text-[var(--ml-text-muted)] text-xs mt-1">Complete daily evaluations first</p>
        </motion.div>
      )}
    </motion.div>
  )
}

function InsightCard({ icon, label, text, color, bg }: { icon: React.ReactNode; label: string; text: string; color: string; bg: string }) {
  return (
    <div className={`p-4 rounded-2xl ${bg} mb-3`}>
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm text-[var(--ml-text-secondary)] leading-relaxed">{text}</p>
    </div>
  )
}

function gradeColor(g: string) {
  return g === 'A' ? 'text-[var(--ml-success)]' : g === 'B' ? 'text-[var(--ml-primary)]' : g === 'C' ? 'text-amber-500' : 'text-[var(--ml-danger)]'
}
