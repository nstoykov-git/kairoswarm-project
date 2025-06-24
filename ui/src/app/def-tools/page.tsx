// src/app/def-tools/page.tsx
import { Suspense } from 'react';
import DefTools from '@/components/DefTools';

export default function DefToolsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DefTools />
    </Suspense>
  );
}

