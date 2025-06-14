"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function ReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const swarmId = searchParams.get("swarm_id");

  const [agents, setAgents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!swarmId) return;
      const res = await fetch(`${API_BASE_URL}/swarm/agents?swarm_id=${swarmId}`);
      const data = await res.json();
      setAgents(data.agents || []);
      const sum = data.agents?.reduce((acc: number, a: any) => acc + (a.price || 0), 0) || 0;
      setTotal(sum);
    };
    fetchData();
  }, [swarmId]);

  const handlePayment = async () => {
    if (!swarmId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swarm_id: swarmId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
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
                  {agent.name} - ${agent.price / 100}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xl font-bold">
            Total: ${total / 100}
          </div>
          <Button onClick={handlePayment} className="bg-blue-600 hover:bg-blue-700 text-white">
            Submit Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

