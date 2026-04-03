import type { Metadata, Viewport } from 'next'
import BottomNav from '@/components/mobile/BottomNav'

export const metadata: Metadata = {
  title: 'Vanilla',
  description: 'AI Productivity System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vanilla',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-light min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <script
        dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
        }}
      />
      <main className="max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
