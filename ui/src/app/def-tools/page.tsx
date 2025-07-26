// src/app/def-tools/page.tsx
"use client";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// tell Next “this is a client‑only import, and I’ll handle loading via Suspense”
const DefTools = dynamic(
  () => import("@/components/DefTools"),
  // @ts-ignore
  { ssr: false, suspense: true }
);

export default function DefToolsPage() {
  return (
    <Suspense fallback={<div>Loading Agent Personality Builder…</div>}>
      <DefTools />
    </Suspense>
  );
}
