// src/app/def-tools/page.tsx
import dynamic from "next/dynamic";
import React from "react";

// Dynamically load the client-only DefTools component
const DefTools = dynamic(() => import("@/components/DefTools"), {
  ssr: false,
  loading: () => <div className="p-6 text-lg text-gray-600">Loading Agent Personality Builder…</div>,
});

export default function DefToolsPage() {
  return (
    <main className="min-h-screen bg-white">
      <DefTools />
    </main>
  );
}
