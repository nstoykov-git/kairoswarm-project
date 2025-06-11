'use client';

import { useSearchParams } from 'next/navigation';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const swarmId = searchParams.get('swarm_id');

  return (
    <div className="p-6 text-white min-h-screen bg-gray-900">
      <h1 className="text-2xl font-bold mb-4">Swarm Dashboard</h1>
      {swarmId ? (
        <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
          <p className="text-gray-300 mb-2">Your Swarm has been created:</p>
          <code className="text-blue-400 font-mono text-lg">{swarmId}</code>
        </div>
      ) : (
        <p className="text-red-400">No swarm ID found in the URL.</p>
      )}
    </div>
  );
}

