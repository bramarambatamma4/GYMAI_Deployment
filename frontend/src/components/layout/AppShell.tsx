import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal gym-app-bg">
      <Navbar />
      <main className="px-5 pb-10 pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
