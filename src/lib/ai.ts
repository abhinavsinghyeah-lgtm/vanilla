import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const MODELS = {
  planning:   'llama-3.3-70b-versatile', // high reasoning
  evaluation: 'llama-3.1-8b-instant'     // fast + cheap
} as const

export interface WeeklyPlanInput {
  goals: string[]
  pendingTasks: Array<{
    title: string
    estimatedMinutes: number
    priority: 'high' | 'medium' | 'low'
    category: 'output' | 'sales' | 'improvement'
  }>
  weekStart: string  // ISO date string (start day)
  numDays: number    // how many days to plan (1-7)
  dayNames: string[] // e.g. ['Friday','Saturday','Sunday']
}

export interface DayAllocation {
  date: string        // ISO date
  dayName: string
  tasks: Array<{
    title: string
    category: 'output' | 'sales' | 'improvement'
    estimatedMinutes: number
    priority: 'high' | 'medium' | 'low'
    description: string
  }>
  totalMinutes: number
  reasoning: string
}

export interface WeeklyPlanOutput {
  weekSummary: string
  days: DayAllocation[]
  unscheduledTasks: string[]
  warnings: string[]
}

export async function generateWeeklyPlan(input: WeeklyPlanInput): Promise<WeeklyPlanOutput> {
  const daysList = input.dayNames.join(', ')
  const prompt = `You are a strict personal productivity AI for a high-performance individual.

Generate a structured execution plan based on the following inputs.

CRITICAL CONSTRAINT: Maximum 2 hours (120 minutes) of work per day. NEVER exceed this.

PLAN STARTS: ${input.weekStart}
DAYS TO PLAN: ${input.numDays} days (${daysList})

GOALS:
${input.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

PENDING TASKS:
${input.pendingTasks.map((t, i) =>
  `${i + 1}. [${t.category.toUpperCase()}] [${t.priority.toUpperCase()}] ${t.title} — ${t.estimatedMinutes} min`
).join('\n')}

INSTRUCTIONS:
- Allocate tasks across EXACTLY these ${input.numDays} days: ${daysList}, never exceeding 120 min/day
- Prioritize HIGH priority tasks first
- Balance categories: mix Output, Sales, Improvement tasks across days
- If total task time exceeds ${input.numDays} days × 120 min, note unscheduled tasks
- Provide brief tactical reasoning for each day's selection
- Tasks can be as short as 5 minutes — do NOT pad or inflate times
- Generate plans for ALL ${input.numDays} days: ${daysList}

Respond ONLY with valid JSON matching this exact structure:
{
  "weekSummary": "string — 2-3 sentence strategic overview",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "tasks": [
        {
          "title": "string",
          "category": "output|sales|improvement",
          "estimatedMinutes": number,
          "priority": "high|medium|low",
          "description": "string — 1-2 sentence execution guide"
        }
      ],
      "totalMinutes": number,
      "reasoning": "string — why these tasks today"
    }
  ],
  "unscheduledTasks": ["task title if overflow"],
  "warnings": ["any constraint violations or notes"]
}`

  const completion = await groq.chat.completions.create({
    model: MODELS.planning,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('AI returned empty response')

  return JSON.parse(content) as WeeklyPlanOutput
}

// ─── Daily Evaluation ────────────────────────────────────────────────────────

export interface EvaluationInput {
  date: string
  plannedTasks: Array<{
    title: string
    category: string
    estimatedMinutes: number
    status: 'completed' | 'missed' | 'in_progress' | 'pending'
    proofText?: string
    proofUrl?: string
  }>
  userNotes?: string
  currentStreak: number
  previousScore?: number
}

export interface EvaluationOutput {
  evaluation: string    // strict paragraph
  score: number         // 0-100
  completionRate: number
  nextDayAdjustments: Array<{
    task: string
    action: 'reschedule' | 'drop' | 'prioritize' | 'split'
    reason: string
  }>
  penaltiesApplied: Array<{
    type: string
    description: string
    impact: string
  }>
  streakStatus: 'maintained' | 'broken' | 'bonus'
}

export async function generateDailyEvaluation(input: EvaluationInput): Promise<EvaluationOutput> {
  const completedTasks = input.plannedTasks.filter(t => t.status === 'completed')
  const missedTasks = input.plannedTasks.filter(t => t.status === 'missed')

  const prompt = `You are a strict, zero-tolerance performance evaluator for a high-output individual.

DATE: ${input.date}
CURRENT STREAK: ${input.currentStreak} days
PREVIOUS SCORE: ${input.previousScore ?? 'N/A'}

COMPLETED TASKS (${completedTasks.length}/${input.plannedTasks.length}):
${completedTasks.map(t => `✓ [${t.category}] ${t.title}${t.proofText ? ` | Proof: ${t.proofText}` : ''}${t.proofUrl ? ` | URL: ${t.proofUrl}` : ''}`).join('\n') || 'NONE'}

MISSED/INCOMPLETE TASKS:
${missedTasks.map(t => `✗ [${t.category}] ${t.title}`).join('\n') || 'None — full completion!'}

USER NOTES: ${input.userNotes || 'None provided'}

EVALUATION RULES:
- Score 90-100: All tasks done + proof provided
- Score 70-89: Most tasks done (80%+) with reasonable reasons
- Score 50-69: Half done — stern warning
- Score below 50: Failure — enforce penalty (double next day, no rest days)
- Streak MAINTAINED if score ≥ 70
- Streak BROKEN if score < 70
- Be STRICT, direct, and honest — no sugarcoating

Respond ONLY with valid JSON:
{
  "evaluation": "string — 3-4 sentence strict evaluation paragraph, call out failures directly",
  "score": number (0-100),
  "completionRate": number (0-100, percentage of tasks completed),
  "nextDayAdjustments": [
    {
      "task": "task title",
      "action": "reschedule|drop|prioritize|split",
      "reason": "brief reason"
    }
  ],
  "penaltiesApplied": [
    {
      "type": "penalty name",
      "description": "what the penalty is",
      "impact": "how it affects tomorrow"
    }
  ],
  "streakStatus": "maintained|broken|bonus"
}`

  const completion = await groq.chat.completions.create({
    model: MODELS.evaluation,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1024,
    response_format: { type: 'json_object' }
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('AI returned empty response')

  return JSON.parse(content) as EvaluationOutput
}

// ─── AI Daily Command ─────────────────────────────────────────────────────────

export async function generateAICommand(tasks: Array<{
  title: string
  category: string
  priority: string
  estimatedMinutes: number
}>): Promise<string> {
  const highPriority = tasks.filter(t => t.priority === 'high')
  const focus = highPriority.length > 0 ? highPriority : tasks

  const prompt = `You are a high-performance execution coach. 
Based on these tasks for today, give ONE single tactical instruction.

TASKS:
${focus.map(t => `[${t.priority.toUpperCase()}] [${t.category}] ${t.title} (${t.estimatedMinutes}min)`).join('\n')}

RULES:
- One sentence only
- Be specific — name the actual task or action
- Make it feel urgent and necessary
- No motivation fluff, just execution directive
- Example: "Send follow-up messages to 3 leads before anything else — this is today's highest ROI action."

Respond with ONLY the instruction sentence, nothing else.`

  const completion = await groq.chat.completions.create({
    model: MODELS.evaluation,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 100
  })

  return completion.choices[0]?.message?.content?.trim() ?? 'Execute your highest priority task first.'
}

// ─── Live Mode AI Assistant ───────────────────────────────────────────────────

export async function generateLiveAssist(
  message: string,
  taskContext?: { title: string; description?: string; category: string; priority: string }
): Promise<string> {
  const contextStr = taskContext
    ? `CURRENT TASK: ${taskContext.title} [${taskContext.category}/${taskContext.priority}]${taskContext.description ? `\nDESCRIPTION: ${taskContext.description}` : ''}`
    : 'No task context provided.'

  const prompt = `You are a fast, no-nonsense execution assistant helping someone complete a task right now.

${contextStr}

USER QUESTION: ${message}

RULES:
- Maximum 2-3 sentences
- Actionable only — no theory
- Direct answer, no preamble
- If it's a "how to" — give the exact steps briefly
- If it's a "what to say" — give the actual words to use`

  const completion = await groq.chat.completions.create({
    model: MODELS.evaluation,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 200
  })

  return completion.choices[0]?.message?.content?.trim() ?? 'Focus on the task. Break it into one immediate action.'
}

// ─── Weekly Review ────────────────────────────────────────────────────────────

export interface WeeklyReviewInput {
  weekStart: string
  goals: string[]
  totalTasks: number
  completedTasks: number
  missedTasks: number
  avgScore: number
  dailyBreakdown: Array<{ date: string; score: number; completed: number; total: number }>
}

export interface WeeklyReviewOutput {
  whatWorked: string
  whatFailed: string
  whatToImprove: string
  aiSummary: string
}

export async function generateWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReviewOutput> {
  const completionRate = input.totalTasks > 0
    ? Math.round((input.completedTasks / input.totalTasks) * 100)
    : 0

  const prompt = `You are a brutal weekly performance reviewer. No sugarcoating.

WEEK OF: ${input.weekStart}
GOALS: ${input.goals.join(', ')}
TASKS: ${input.completedTasks}/${input.totalTasks} completed (${completionRate}%)
MISSED: ${input.missedTasks}
AVG SCORE: ${input.avgScore}/100

DAILY BREAKDOWN:
${input.dailyBreakdown.map(d => `${d.date}: ${d.completed}/${d.total} tasks, score ${d.score}`).join('\n')}

Generate a strict weekly review. Be specific about failures. Identify patterns.

Respond ONLY with valid JSON:
{
  "whatWorked": "1-2 sentences on genuine wins this week",
  "whatFailed": "1-2 sentences naming specific failures and their pattern",
  "whatToImprove": "1-2 sentences with exact next week changes",
  "aiSummary": "3-4 sentence executive summary of the week — direct and honest"
}`

  const completion = await groq.chat.completions.create({
    model: MODELS.planning,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
    response_format: { type: 'json_object' }
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('AI returned empty response')

  return JSON.parse(content) as WeeklyReviewOutput
}

