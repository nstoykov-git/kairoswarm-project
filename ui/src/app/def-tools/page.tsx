// src/app/def-tools/page.tsx
"use client";

import dynamic from "next/dynamic";

// this component will never be server‑rendered
const DefTools = dynamic(() => import("@/components/DefTools"), {
  ssr: false,
  loading: () => <div>Loading Agent Personality Builder…</div>,
});

export default function DefToolsPage() {
  return <DefTools />;
}
