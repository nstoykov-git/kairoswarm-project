'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const swarmId = searchParams.get('swarm_id');
  const [copied, setCopied] = useState(false);

  const handleOk = () => {
    setTimeout(() => {
      router.replace(`/dashboard?swarm_id=${swarmId}`);
    }, 100);
  };

  const handleCopy = async () => {
    if (swarmId) {
      await navigator.clipboard.writeText(swarmId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900">
      <h1 className="text-2xl font-bold mb-4">Swarm Dashboard</h1>
      {swarmId ? (
        <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
          <p className="text-gray-300 mb-2">Your Swarm has been created:</p>
          <div className="flex items-center gap-2">
            <code className="text-lime-400 bg-black font-mono text-lg px-2 py-1 rounded break-all inline-block">
              {swarmId}
            </code>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push(`/?swarm_id=default`)}>
              OK
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-red-400">No swarm ID found in the URL.</p>
      )}
    </div>
  );
}
