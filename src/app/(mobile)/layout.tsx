import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import BottomNav from '@/components/mobile/BottomNav'


const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false })

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

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} mobile-light`} style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
        <main className="max-w-lg mx-auto">{children}</main>
        <BottomNav />
      </body>
    </html>
  )
}
