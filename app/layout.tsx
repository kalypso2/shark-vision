import type { Metadata } from 'next'
import Image from 'next/image'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shark Vision - Webcam App',
  description: 'Next.js app with integrated webcam access',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Floating Logo - Always visible on all pages */}
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          animation: 'float 3s ease-in-out infinite',
          zIndex: 9999,
        }}>
          <Image
            src="/sharkvision_logo.png"
            alt="SharkVision Logo"
            width={180}
            height={180}
            priority
          />
        </div>
        {children}
      </body>
    </html>
  )
}

