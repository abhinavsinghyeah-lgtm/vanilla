import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vanilla — AI Productivity System',
  description: 'Personal high-performance productivity system powered by AI'
}

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
