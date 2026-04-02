'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface TaskContext {
  title: string
  description?: string | null
  category: string
  priority: string
}

interface AIChatPanelProps {
  taskContext?: TaskContext
}

export default function AIChatPanel({ taskContext }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: taskContext
        ? `I'm here to help you execute "${taskContext.title}". Ask me anything — scripts, steps, ideas, or blockers.`
        : "I'm your execution assistant. Ask me anything to unblock you right now."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          taskContext: taskContext
            ? {
                title: taskContext.title,
                description: taskContext.description,
                category: taskContext.category,
                priority: taskContext.priority
              }
            : undefined
        })
      })
      const json = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: json.reply ?? 'No response received.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to get AI response. Check your connection.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <Bot className="h-4 w-4 text-yellow-400" />
        <span className="text-sm font-semibold text-zinc-300">AI Assist</span>
        <span className="ml-auto text-xs text-zinc-600">Shift+Enter = newline</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-yellow-400" />
              </div>
            )}
            <div className={cn(
              'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-yellow-500/15 border border-yellow-500/25 text-yellow-100 rounded-br-sm'
                : 'bg-zinc-800/60 border border-zinc-700/60 text-zinc-200 rounded-bl-sm'
            )}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-zinc-700/50 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-zinc-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700/60 px-3 py-2 rounded-xl rounded-bl-sm">
              <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-zinc-800/60">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for help, scripts, steps..."
            rows={2}
            maxLength={500}
            className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 resize-none"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
