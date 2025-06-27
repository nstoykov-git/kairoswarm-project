"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { toast } from "react-hot-toast";

export default function MyAgentsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      toast.error("You must be signed in.");
      router.push("/auth");
      return;
    }

    fetchAgents();
  }, [user, loading, router]);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      console.error("Error fetching agents:", error);
      toast.error("Failed to load agents.");
    } else {
      setAgents(data || []);
    }
  };

  const handleUnpublish = async (agentId: string) => {
    try {
      const token = localStorage.getItem("kairoswarm_token") || "";
      if (!token) throw new Error("You must be signed in.");

      const res = await fetch(`${process.env.NEXT_PUBLIC_MODAL_API_URL}/swarm/unpublish-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agent_id: agentId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed to unpublish agent.");

      toast.success("✅ Agent unpublished successfully.");
      fetchAgents(); // Refresh list
    } catch (err: any) {
      console.error("Unpublish error:", err);
      toast.error(err.message || "Something went wrong.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-2xl font-bold">My Agents</h1>
      <Button variant="secondary" onClick={() => router.push("/profile")}>
        ⬅ Back to Profile
      </Button>

      {agents.length === 0 && (
        <p className="text-gray-600 mt-4">You haven’t published any agents yet.</p>
      )}

      {agents.map((agent) => (
        <div key={agent.id} className="border p-4 rounded-lg flex justify-between items-center">
          <div>
            <h2 className="font-semibold">{agent.name}</h2>
            <p className="text-sm text-gray-500">{agent.description}</p>
            <p className="text-sm mt-1">Status: {agent.is_published ? "Published" : "Unpublished"}</p>
          </div>

          {agent.is_published && (
            <Button variant="destructive" onClick={() => handleUnpublish(agent.id)}>
              Unpublish
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

