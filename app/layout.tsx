import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GitHub Copilot Analytics Dashboard',
  description: 'Visualize usage, engagement, and feature adoption for Copilot across editors and languages',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
