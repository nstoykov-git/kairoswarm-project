"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  videoUrl: string;
  orientation: 'portrait' | 'landscape';
}

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;
const VIDEO_MAP: Record<string, { videoUrl: string; orientation: 'portrait' | 'landscape' }> = {
  'Marin': { videoUrl: '/videos/Marin.mp4', orientation: 'portrait' },
  'Max': { videoUrl: '/videos/Max.mp4', orientation: 'landscape' },
  'Logan': { videoUrl: '/videos/Logan.mp4', orientation: 'landscape' },
  'Lumen': { videoUrl: '/videos/Lumen.mp4', orientation: 'landscape' },
  'Iris': { videoUrl: '/videos/Iris.mp4', orientation: 'landscape' },
};

export default function AgentIntroCarousel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-names`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            names: Object.keys(VIDEO_MAP),
          }),
        });
        const data = await res.json();
        if (Array.isArray(data.agents)) {
          const enriched = data.agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            videoUrl: VIDEO_MAP[agent.name]?.videoUrl || '',
            orientation: VIDEO_MAP[agent.name]?.orientation || 'landscape',
          })).filter((a: Agent) => a.videoUrl);
          setAgents(enriched);
        }
      } catch (err) {
        console.error('Failed to fetch agents', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => agents.length ? (prev + 1) % agents.length : 0);
    }, 6000);
    return () => clearInterval(interval);
  }, [agents]);

  const handleSelect = async (agent: Agent) => {
    try {
      const res = await fetch(`${API_INTERNAL_URL}/swarm/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_ids: [agent.id] }),
      });

      const data = await res.json();
      if (!data.swarm_id) throw new Error('No swarm_id returned');
      router.push(`/dashboard?swarm_id=${data.swarm_id}`);
    } catch (err) {
      console.error(err);
      alert('⚠️ Failed to initiate swarm');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-xl animate-pulse">Loading agents...</span>
      </div>
    );
  }

  if (!agents.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-lg">No available agents found.</span>
      </div>
    );
  }

  const activeAgent = agents[index];
  const isPortrait = activeAgent.orientation === 'portrait';

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background Video */}
      <video
        key={`bg-${activeAgent.id}`}
        src={activeAgent.videoUrl}
        className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Foreground Video */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <video
          key={`fg-${activeAgent.id}`}
          src={activeAgent.videoUrl}
          className={`${
            isPortrait ? 'h-[80%]' : 'w-full max-w-screen-xl'
          } rounded-xl shadow-2xl`}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute bottom-24 text-center">
          <h1 className="text-white text-4xl font-semibold mb-2 drop-shadow-lg">
            {activeAgent.name}
          </h1>
          <button
            onClick={() => handleSelect(activeAgent)}
            className="text-white text-lg underline hover:opacity-80"
          >
            Talk to me
          </button>
        </div>
      </div>
    </div>
  );
}
