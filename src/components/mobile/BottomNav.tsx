'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, CalendarDays, CheckCircle2, BarChart3, Trophy } from 'lucide-react'

const tabs = [
  { href: '/m', icon: Home, label: 'Home' },
  { href: '/m/plan', icon: CalendarDays, label: 'Plan' },
  { href: '/m/daily', icon: CheckCircle2, label: 'Today' },
  { href: '/m/review', icon: BarChart3, label: 'Review' },
  { href: '/m/rewards', icon: Trophy, label: 'Rewards' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[var(--ml-border-light)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/m' ? pathname === '/m' : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full"
            >
              <motion.div
                whileTap={{ scale: 0.82 }}
                className="flex flex-col items-center gap-1"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[var(--ml-primary)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    isActive ? 'text-[var(--ml-primary)]' : 'text-[var(--ml-text-muted)]'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                  className={`text-[10px] font-semibold transition-colors duration-200 ${
                    isActive ? 'text-[var(--ml-primary)]' : 'text-[var(--ml-text-muted)]'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
