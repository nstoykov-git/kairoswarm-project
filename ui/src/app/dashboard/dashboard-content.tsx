'use client';

import { useSearchParams } from 'next/navigation';
import KairoswarmDashboard from '@/components/KairoswarmDashboard';

export default function DashboardContent() {
  const searchParams = useSearchParams();
  const swarmId = searchParams.get('swarm_id');

  if (!swarmId) {
    return (
      <div className="p-6 text-white min-h-screen bg-gray-900">
        <p className="text-red-400">No swarm ID found in the URL.</p>
      </div>
    );
  }

  return <KairoswarmDashboard swarmId={swarmId} />;
}
