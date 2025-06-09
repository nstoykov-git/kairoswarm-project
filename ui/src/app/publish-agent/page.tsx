"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function PublishAgentForm() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [assistantId, setAssistantId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [hasFreeTier, setHasFreeTier] = useState(true);
  const [price, setPrice] = useState(0);
  const [isNegotiable, setIsNegotiable] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user) setUserId(user.id);
      else router.push("/auth");
    });
  }, [router]);

  const handleSubmit = async () => {
    setMessage("");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_MODAL_API_URL}/swarm/publish-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: assistantId,
          name,
          description,
          skills: skills.split(",").map((s) => s.trim()),
          has_free_tier: hasFreeTier,
          price,
          is_negotiable: isNegotiable,
          user_id: userId,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      setMessage("❌ " + data.detail || "Error publishing agent");
    } else {
      setMessage("✅ Agent published!");
      setTimeout(() => router.push("/"), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4 bg-gray-900 text-white">
      <h2 className="text-xl font-bold">Publish Your AI Assistant</h2>

      <div className="space-y-2">
        <Label>Assistant ID (from OpenAI)</Label>
        <Input value={assistantId} onChange={(e) => setAssistantId(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Assistant Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Skills (comma-separated)</Label>
        <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" checked={hasFreeTier} onChange={() => setHasFreeTier(!hasFreeTier)} />
        <Label>Offers a free tier</Label>
      </div>

      <div className="space-y-2">
        <Label>Daily Rate (USD)</Label>
        <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
      </div>

      <div className="flex items-center space-x-2">
        <input type="checkbox" checked={isNegotiable} onChange={() => setIsNegotiable(!isNegotiable)} />
        <Label>Rate is negotiable</Label>
      </div>

      <Button onClick={handleSubmit}>Publish</Button>

      {message && <p className="text-yellow-400 text-sm mt-2">{message}</p>}
    </div>
  );
}

