// src/app/def-tools/page.tsx
import dynamic from "next/dynamic";

// Import _only_ on the client
const DefToolsClient = dynamic(
  () => import("@/components/DefTools"),
  {
    ssr: false,
    loading: () => <div>Loading Agent Personality Builder…</div>,
  }
);

export default function DefToolsPage() {
  return <DefToolsClient />;
}
