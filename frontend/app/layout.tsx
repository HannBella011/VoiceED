import type { Metadata } from 'next'
import '../styles/globals.css'
import { AuthProvider } from '@/context/AuthContext'

export const metadata: Metadata = {
  title: 'VoiceED - Where Every Student\'s Voice Matters',
  description: 'A student-driven platform that empowers learners to be heard, supported, and inspired.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}