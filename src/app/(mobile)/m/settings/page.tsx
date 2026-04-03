'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Trash2, AlertTriangle, ChevronLeft, Shield, CheckCircle2,
} from 'lucide-react'

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } } as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } } }

type ConfirmStep = null | 'week_1' | 'week_2' | 'all_1' | 'all_2' | 'all_3'

export default function MobileSettingsPage() {
  const router = useRouter()
  const [confirmStep, setConfirmStep] = useState<ConfirmStep>(null)
  const [confirmInput, setConfirmInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function clearWeek() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_week', confirmPhrase: 'CLEAR WEEK' }),
      })
      const d = await res.json()
      setResult(d.success ? 'Current week cleared!' : d.error)
      setConfirmStep(null)
      setConfirmInput('')
    } finally { setLoading(false) }
  }

  async function clearAll() {
    if (confirmInput !== 'DELETE EVERYTHING') return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all', confirmPhrase: 'DELETE EVERYTHING' }),
      })
      const d = await res.json()
      setResult(d.success ? 'All data cleared!' : d.error)
      setConfirmStep(null)
      setConfirmInput('')
    } finally { setLoading(false) }
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="min-h-screen pb-28 px-5 pt-14">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-8">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => router.back()} className="p-2 rounded-xl bg-[var(--ml-surface)] border border-[var(--ml-border-light)]">
          <ChevronLeft className="h-5 w-5 text-[var(--ml-text)]" />
        </motion.button>
        <h1 className="text-2xl font-bold text-[var(--ml-text)]">Settings</h1>
      </motion.div>

      {/* Success Banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-2xl bg-[var(--ml-success-bg)] border border-[var(--ml-success)]/20 flex items-center gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-[var(--ml-success)] shrink-0" />
            <span className="text-sm font-medium text-[var(--ml-text)]">{result}</span>
            <button onClick={() => setResult(null)} className="ml-auto text-xs text-[var(--ml-text-muted)]">OK</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Management */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-[var(--ml-text-muted)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ml-text-muted)]">Data Management</h2>
        </div>

        {/* Clear Current Week */}
        <div className="p-4 rounded-2xl border border-[var(--ml-border-light)] bg-white mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ml-text)]">Clear Current Week</p>
              <p className="text-xs text-[var(--ml-text-muted)] mt-0.5">Removes this week&apos;s plan, tasks, evaluations</p>
            </div>
            {confirmStep !== 'week_1' && confirmStep !== 'week_2' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setConfirmStep('week_1')}
                className="px-3 py-1.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg"
              >
                Clear
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {confirmStep === 'week_1' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Are you sure?</span>
                  </div>
                  <p className="text-xs text-amber-600 mb-3">This will delete all tasks, evaluations, and scores for this week.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmStep('week_2')} className="flex-1 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg">Yes, I&apos;m Sure</button>
                    <button onClick={() => setConfirmStep(null)} className="flex-1 py-2 bg-white text-[var(--ml-text-muted)] text-xs font-medium rounded-lg border border-[var(--ml-border)]">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
            {confirmStep === 'week_2' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Final Confirmation</span>
                  </div>
                  <p className="text-xs text-red-600 mb-3">This cannot be undone. All week data will be permanently deleted.</p>
                  <div className="flex gap-2">
                    <button onClick={clearWeek} disabled={loading} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                      {loading ? 'Clearing...' : 'Delete Week Data'}
                    </button>
                    <button onClick={() => setConfirmStep(null)} className="flex-1 py-2 bg-white text-[var(--ml-text-muted)] text-xs font-medium rounded-lg border border-[var(--ml-border)]">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Clear All Data */}
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50/30 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Clear All Data</p>
              <p className="text-xs text-red-400 mt-0.5">Removes ALL plans, tasks, scores, streaks, rewards</p>
            </div>
            {!confirmStep?.startsWith('all') && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setConfirmStep('all_1')}
                className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-lg"
              >
                <Trash2 className="h-3 w-3 inline mr-1" />Clear
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {confirmStep === 'all_1' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 p-3 bg-red-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-semibold text-red-700">Warning: Destructive Action</span>
                  </div>
                  <p className="text-xs text-red-600 mb-3">This will permanently delete ALL your data including streaks and rewards.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmStep('all_2')} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg">I Understand</button>
                    <button onClick={() => setConfirmStep(null)} className="flex-1 py-2 bg-white text-[var(--ml-text-muted)] text-xs font-medium rounded-lg border border-[var(--ml-border)]">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
            {confirmStep === 'all_2' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 p-3 bg-red-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-700" />
                    <span className="text-xs font-semibold text-red-800">Second Confirmation</span>
                  </div>
                  <p className="text-xs text-red-600 mb-3">Are you absolutely sure? This is irreversible.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmStep('all_3')} className="flex-1 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Yes, Proceed</button>
                    <button onClick={() => setConfirmStep(null)} className="flex-1 py-2 bg-white text-[var(--ml-text-muted)] text-xs font-medium rounded-lg border border-[var(--ml-border)]">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
            {confirmStep === 'all_3' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 p-3 bg-red-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="h-4 w-4 text-red-800" />
                    <span className="text-xs font-semibold text-red-900">Final Step: Type Confirmation</span>
                  </div>
                  <p className="text-xs text-red-700 mb-3">Type <strong>DELETE EVERYTHING</strong> to confirm.</p>
                  <input
                    value={confirmInput}
                    onChange={e => setConfirmInput(e.target.value)}
                    placeholder="DELETE EVERYTHING"
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-red-300 text-sm text-red-800 placeholder:text-red-300 font-mono focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={clearAll}
                      disabled={loading || confirmInput !== 'DELETE EVERYTHING'}
                      className="flex-1 py-2.5 bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-40"
                    >
                      {loading ? 'Deleting...' : 'PERMANENTLY DELETE ALL DATA'}
                    </button>
                    <button onClick={() => { setConfirmStep(null); setConfirmInput('') }} className="px-4 py-2 bg-white text-[var(--ml-text-muted)] text-xs font-medium rounded-lg border border-[var(--ml-border)]">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
