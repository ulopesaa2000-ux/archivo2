// C:\Users\uriel\Downloads\enero 26\archivo2\app\(store)\layout.tsx
import { ReactNode, Suspense } from 'react'
import { StoreFooter } from '@/components/store/layout/StoreFooter'
import { StoreHeader } from '@/components/store/layout/StoreHeader'
import { storeMetadata, storeViewport } from '@/lib/seo/store-metadata'
import { verifySessionOptional } from '@/lib/dal'

export const metadata = storeMetadata
export const viewport = storeViewport

async function StoreHeaderWithUser() {
  const session = await verifySessionOptional()
  return <StoreHeader user={session.user} />
}

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-store-bg text-store-ink font-sans antialiased">
      <Suspense
        fallback={<header className="h-[64px] bg-store-surface border-b border-store-border" />}
      >
        <StoreHeaderWithUser />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Suspense
        fallback={<footer className="bg-store-surface border-t border-store-border h-32" />}
      >
        <StoreFooter />
      </Suspense>
    </div>
  )
}
