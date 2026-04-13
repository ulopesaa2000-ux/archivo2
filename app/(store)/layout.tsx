// app/(store)/layout.tsx
import { ReactNode } from 'react'
import { StoreHeader } from '@/components/store/layout/StoreHeader'
import { StoreFooter } from '@/components/store/layout/StoreFooter'

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-store-bg text-store-ink font-sans">
      <StoreHeader />
      <main className="flex-1">
        {children}
      </main>
      <StoreFooter />
    </div>
  )
}
