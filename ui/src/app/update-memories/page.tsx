// src/app/update-memories/page.tsx
'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function UpdateMemoriesEntry() {
  const router = useRouter();
  const [agentId, setAgentId] = useState("");

  const handleSubmit = () => {
    if (!agentId.trim()) return;
    router.push(`/agents/${agentId.trim()}/edit-memories`);
  };

  return (
    <div className="max-w-md mx-auto mt-16 space-y-4 p-6">
      <h1 className="text-2xl font-bold">Update Agent Memories</h1>
      <p className="text-gray-600">Enter your agent's ID to view and edit recent memories.</p>
      <Input
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        placeholder="Paste your agent ID here"
      />
      <Button onClick={handleSubmit} className="w-full">
        Continue
      </Button>
    </div>
  );
}

