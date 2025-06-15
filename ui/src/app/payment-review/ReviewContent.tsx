"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { useUser } from "@/context/UserContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const agentIdsParam = searchParams.get("agent_ids") ?? "";
  const agentIds = agentIdsParam.split(",").filter(Boolean);

  const [agents, setAgents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (agentIds.length === 0) return;

      const res = await fetch(`${API_BASE_URL}/swarm/agents/by-ids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_ids: agentIds }),
      });

      if (!res.ok) {
        toast.error("Failed to fetch agent details");
        return;
      }

      const data = await res.json();
      const agentList = data.agents ?? [];
      setAgents(agentList);

      const sum = agentList.reduce((acc: number, a: any) => acc + (a.price ?? 0), 0);
      setTotal(sum); // cents
    }
    fetchData();
  }, [agentIds]);

  const handlePayment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_ids: agentIds,
          user_id: user?.id ?? "anonymous",
        }),
      });
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
      <Card className="bg-gray-800 border border-gray-600">
        <CardContent className="p-4 space-y-4 text-white">
          <div>
            <h2 className="text-lg font-semibold mb-2 text-white">Selected Agents</h2>
            <ul className="list-disc list-inside text-gray-200">
              {agents.map((agent) => (
                <li key={agent.id} className="py-1">
                  <span className="font-medium text-white">{agent.name}</span>
                  {" — "}
                  <span className="font-bold text-green-400">${(agent.price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xl font-extrabold text-white">
            Total: <span className="text-green-400">${(total).toFixed(2)}</span>
          </div>
          <Button
            onClick={handlePayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
