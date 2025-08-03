// src/app/concierge/page.tsx
'use client'

import { Suspense } from 'react'
import ConciergePage from '@/components/KairoswarmConcierge'

export default function Concierge() {
  return (
    <Suspense fallback={<div>Loading concierge...</div>}>
      <ConciergePage />
    </Suspense>
  )
}
