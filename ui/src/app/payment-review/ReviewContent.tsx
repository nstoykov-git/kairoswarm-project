"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { useUser } from "@/context/UserContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function ReviewContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();

  const agentIds = (searchParams.get("agent_ids") ?? "")
    .split(",")
    .filter(Boolean);

  const [agents, setAgents] = useState<any[]>([]);
  const [totalCents, setTotalCents] = useState(0);

  useEffect(() => {
    async function fetchAgents() {
      if (agentIds.length === 0) return;

      const res = await fetch(
        `${API_BASE_URL}/swarm/agents?agent_ids=${agentIds.join(",")}`
      );
      const data = await res.json();

      const list = data.agents || [];
      setAgents(list);

      const sum = list.reduce((acc: number, a: any) => acc + (a.price || 0), 0);
      setTotalCents(sum);
    }

    fetchAgents();
  }, [agentIds]);

  const handlePayment = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/payments/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_ids: agentIds,
            user_id: user?.id ?? "anonymous",
          }),
        }
      );
      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("No checkout URL returned");
      }
    } catch {
      toast.error("Failed to start checkout");
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold">Review & Payment</h1>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Selected Agents</h2>
            <ul className="list-disc list-inside text-gray-300">
              {agents.map((agent) => (
                <li key={agent.id}>
                  {agent.name} — ${(agent.price! / 100).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xl font-bold">
            Total: ${(totalCents / 100).toFixed(2)}
          </div>
          <Button
            onClick={handlePayment}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
