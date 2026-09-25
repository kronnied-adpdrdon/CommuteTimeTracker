import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TrackOT - Overtime Tracker',
  description: 'Track your daily working hours and overtime easily.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main className="container animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  )
}
