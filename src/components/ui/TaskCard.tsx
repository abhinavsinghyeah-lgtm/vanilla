import { cn, getCategoryColor, getPriorityColor, minutesToHM } from '@/lib/utils'

interface Task {
  id: string
  title: string
  category: string
  priority: string
  estimatedMinutes: number
  status: string
  proofText?: string | null
  proofUrl?: string | null
  description?: string | null
}

interface TaskCardProps {
  task: Task
  onStatusChange?: (id: string, status: string) => void
  onProofSubmit?: (id: string, text: string, url: string) => void
  interactive?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Done',
  missed:      'Missed',
  postponed:   'Postponed'
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-zinc-400 border-zinc-700',
  in_progress: 'text-blue-400 border-blue-700',
  completed:   'text-green-400 border-green-700',
  missed:      'text-red-400 border-red-700',
  postponed:   'text-yellow-400 border-yellow-700'
}

export default function TaskCard({ task, onStatusChange, onProofSubmit, interactive = true }: TaskCardProps) {
  const isCompleted = task.status === 'completed'
  const isMissed = task.status === 'missed'

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all duration-200',
      isCompleted ? 'border-green-800/40 bg-green-900/10' :
      isMissed    ? 'border-red-800/40 bg-red-900/10' :
                    'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              getCategoryColor(task.category)
            )}>
              {task.category}
            </span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              getPriorityColor(task.priority)
            )}>
              {task.priority}
            </span>
            <span className="text-xs text-zinc-600">{minutesToHM(task.estimatedMinutes)}</span>
          </div>

          <h3 className={cn(
            'text-sm font-medium leading-snug',
            isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'
          )}>
            {task.title}
          </h3>

          {task.description && (
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {task.proofText && (
            <p className="text-xs text-zinc-500 mt-2 italic">Proof: {task.proofText}</p>
          )}
          {task.proofUrl && (
            <a
              href={task.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-yellow-500 hover:underline mt-1 block"
            >
              View proof →
            </a>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border',
            STATUS_COLORS[task.status] ?? 'text-zinc-400 border-zinc-700'
          )}>
            {STATUS_LABELS[task.status] ?? task.status}
          </span>

          {interactive && !isCompleted && !isMissed && onStatusChange && (
            <div className="flex gap-1">
              <button
                onClick={() => onStatusChange(task.id, 'completed')}
                className="text-xs px-2 py-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-lg transition-colors"
              >
                ✓ Done
              </button>
              <button
                onClick={() => onStatusChange(task.id, 'missed')}
                className="text-xs px-2 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                ✗ Miss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
