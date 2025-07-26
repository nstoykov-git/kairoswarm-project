// src/app/def-tools/page.tsx
'use client';

import { Suspense } from "react";
import DefTools from "@/components/DefTools";

export default function DefToolsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading Agent Personality Builder…</div>}>
      <DefTools />
    </Suspense>
  );
}
