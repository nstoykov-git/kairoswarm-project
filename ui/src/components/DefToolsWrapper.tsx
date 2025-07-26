// src/components/DefToolsWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";

// Load the actual DefTools component on the client side
const DefTools = dynamic(() => import("./DefTools"), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-600">Loading Agent Personality Builder…</div>,
});

export default function DefToolsWrapper() {
  return <DefTools />;
}

