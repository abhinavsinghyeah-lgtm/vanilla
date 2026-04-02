'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  Trophy,
  Zap,
  BarChart3
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Overview',       icon: LayoutDashboard },
  { href: '/dashboard/weekly',     label: 'Weekly Plan',    icon: CalendarRange   },
  { href: '/dashboard/daily',      label: 'Daily Tasks',    icon: CheckSquare     },
  { href: '/dashboard/evaluation', label: 'Evaluation',     icon: ClipboardCheck  },
  { href: '/dashboard/review',     label: 'Weekly Review',  icon: BarChart3       },
  { href: '/dashboard/rewards',    label: 'Rewards',        icon: Trophy          }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-zinc-800/60 flex flex-col bg-zinc-950/40">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/60 gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-yellow-400" />
        </div>
        <span className="font-bold text-white tracking-tight text-lg">Vanilla</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800/60">
        <div className="text-xs text-zinc-700">
          Vanilla v2 · AI Productivity
        </div>
      </div>
    </aside>
  )
}
