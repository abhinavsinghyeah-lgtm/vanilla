import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number       // 0-100
  max?: number
  label?: string
  showValue?: boolean
  color?: 'yellow' | 'green' | 'blue' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colorMap = {
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  red:    'bg-red-500'
}

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3'
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'yellow',
  size = 'md',
  className
}: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100)

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-zinc-400">{label}</span>}
          {showValue && <span className="text-xs font-medium text-zinc-300">{pct}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-zinc-800 rounded-full overflow-hidden', sizeMap[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
