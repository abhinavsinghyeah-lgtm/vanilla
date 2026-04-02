import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  accent?: 'yellow' | 'green' | 'blue' | 'purple' | 'red' | 'default'
  className?: string
}

const accentMap = {
  yellow:  'border-yellow-500/20 bg-yellow-500/5',
  green:   'border-green-500/20 bg-green-500/5',
  blue:    'border-blue-500/20 bg-blue-500/5',
  purple:  'border-purple-500/20 bg-purple-500/5',
  red:     'border-red-500/20 bg-red-500/5',
  default: 'border-zinc-800/60 bg-zinc-900/40'
}

const iconAccentMap = {
  yellow:  'text-yellow-400',
  green:   'text-green-400',
  blue:    'text-blue-400',
  purple:  'text-purple-400',
  red:     'text-red-400',
  default: 'text-zinc-400'
}

export default function StatCard({ label, value, sub, icon, accent = 'default', className }: StatCardProps) {
  return (
    <div className={cn(
      'relative rounded-2xl border p-5 transition-all duration-200 hover:border-zinc-700/60',
      accentMap[accent],
      className
    )}>
      {icon && (
        <div className={cn('mb-3', iconAccentMap[accent])}>
          {icon}
        </div>
      )}
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-sm text-zinc-400">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  )
}
