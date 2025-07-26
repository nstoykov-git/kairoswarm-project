// src/components/DefTools.tsx
"use client";

import { useState, useEffect } from "react";
// … all your other imports …

export default function DefTools() {
  // 1) mount guard
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    // server and before hydration: render a simple loading placeholder
    return <div>Loading Agent Personality Builder…</div>;
  }

  // 2) once mounted, render your full UI
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black">Agent Personality Builder</h1>
      {/* … the rest of your sliders, charts, buttons, etc. … */}
    </div>
  );
}
