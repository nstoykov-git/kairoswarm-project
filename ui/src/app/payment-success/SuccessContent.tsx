// src/app/payment-success/SuccessContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const swarmId = searchParams.get('swarm_id');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (swarmId) {
      toast.success(`✅ Swarm Paid — ID: ${swarmId}`);
    }
  }, [swarmId]);

  const copySwarmId = () => {
    if (swarmId) {
      navigator.clipboard.writeText(swarmId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const goToDashboard = () => {
    if (swarmId) router.push(`/dashboard?swarm_id=${swarmId}`);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center space-y-6">
      <Card className="w-full max-w-md bg-black">
        <CardContent className="p-6 space-y-4">
          <h1 className="text-2xl font-bold text-green-400">Payment Successful!</h1>
          <p>Your swarm has been created and is ready to use.</p>

          {swarmId && (
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm bg-gray-800 px-2 py-1 rounded-lg">{swarmId}</span>
              <Button variant="outline" onClick={copySwarmId}>
                {copied ? 'Copied!' : 'Copy ID'}
              </Button>
            </div>
          )}

          <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={goToDashboard}>
            OK
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

