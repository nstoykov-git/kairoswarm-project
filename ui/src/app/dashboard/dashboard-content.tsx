'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const swarmId = searchParams.get('swarm_id');

  const handleOk = () => {
    router.replace(`/dashboard?swarm_id=${swarmId}`);
    router.refresh();
  };

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900">
      <h1 className="text-2xl font-bold mb-4">Swarm Dashboard</h1>
      {swarmId ? (
        <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
          <p className="text-gray-300 mb-2">Your Swarm has been created:</p>
          <code className="text-blue-400 font-mono text-lg break-all">{swarmId}</code>
          <div className="mt-4">
            <Button onClick={handleOk}>OK</Button>
          </div>
        </div>
      ) : (
        <p className="text-red-400">No swarm ID found in the URL.</p>
      )}
    </div>
  );
}
