import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function PreCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const swarmId = searchParams.get('swarm_id');

  const [agents, setAgents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!swarmId) return;

    const fetchAgents = async () => {
      const res = await fetch(`${API_BASE_URL}/swarm/agents?swarm_id=${swarmId}`);
      const data = await res.json();
      setAgents(data.agents || []);
      setTotal(data.agents.reduce((sum: number, a: any) => sum + (a.price || 0), 0));
    };

    fetchAgents();
  }, [swarmId]);

  const handleProceedToPayment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swarm_id: swarmId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      toast.error('Failed to start checkout');
    }
  };

  const handleReturn = () => {
    router.push('/concierge');
  };

  return (
    <div className="p-6 space-y-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold">Review Your Order</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardContent className="space-y-2 p-4">
              <h2 className="text-xl font-semibold">{agent.name}</h2>
              <p className="text-sm text-gray-400 line-clamp-3">{agent.description}</p>
              <div className="text-lg font-bold">${agent.price.toFixed(2)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="text-xl font-bold">Total: ${total.toFixed(2)}</div>
      <div className="flex gap-4">
        <Button onClick={handleProceedToPayment} className="bg-blue-600 hover:bg-blue-700 text-white">
          Proceed to Payment
        </Button>
        <Button variant="secondary" onClick={handleReturn}>Cancel & Return</Button>
      </div>
    </div>
  );
}

