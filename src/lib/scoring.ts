export function calculateGrade(score: number): string {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'F'
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-400'
    case 'B': return 'text-yellow-400'
    case 'C': return 'text-orange-400'
    case 'F': return 'text-red-500'
    default:  return 'text-zinc-400'
  }
}

export function gradeAccent(grade: string): string {
  switch (grade) {
    case 'A': return 'border-green-500/30 bg-green-500/5'
    case 'B': return 'border-yellow-500/30 bg-yellow-500/5'
    case 'C': return 'border-orange-500/30 bg-orange-500/5'
    case 'F': return 'border-red-500/30 bg-red-500/5'
    default:  return 'border-zinc-700/40 bg-zinc-900/40'
  }
}
