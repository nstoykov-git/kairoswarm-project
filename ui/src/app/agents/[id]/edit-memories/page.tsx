import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function EditMemoriesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchAgent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/swarm/agents/by-ids`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_ids: [id] }),
        });
        const data = await res.json();
        const agent = data.agents?.[0];
        if (agent?.recent_memories) {
          setMemories(agent.recent_memories);
        }
      } catch (err) {
        toast.error("Failed to load memories");
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/swarm/agents/${id}/recent-memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recent_memories: memories }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success("Memories updated!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Failed to save updates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Update Memories</h1>
      <p className="text-gray-600">
        Add or edit what’s recently true or top-of-mind for this agent. These will be shown in the system prompt under a [MEMORIES] block.
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={memories.join("\n")}
            onChange={(e) => setMemories(e.target.value.split("\n"))}
            rows={10}
            placeholder="Got new shoes yesterday\nExcited about fall launch\nStarting to drink tea again"
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Updates"}
          </Button>
        </div>
      )}
    </div>
  );
}

