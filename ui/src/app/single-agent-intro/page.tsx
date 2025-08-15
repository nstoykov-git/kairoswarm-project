//app/single-agent-intro/page.tsx
"use client";

import { Suspense } from "react";
import SingleAgentFromSwarm from "@/components/SingleAgentFromSwarm";

export default function SingleAgentIntroPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <SingleAgentFromSwarm />
    </Suspense>
  );
}
