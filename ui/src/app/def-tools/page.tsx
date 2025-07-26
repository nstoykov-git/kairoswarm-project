// src/app/def-tools/page.tsx
"use client";

import dynamic from "next/dynamic";

// dynamically import DefTools with SSR disabled and a loading fallback
const DefTools = dynamic(
  () => import("@/components/DefTools"),
  {
    ssr: false,
    loading: () => <div>Loading Agent Personality Builder…</div>,
  }
);

export default function DefToolsPage() {
  return <DefTools />;
}
