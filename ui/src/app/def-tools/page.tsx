// src/app/def-tools/page.tsx
import dynamic from "next/dynamic";

// NO "use client" here → this stays a server component
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
