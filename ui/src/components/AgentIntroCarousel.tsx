"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const agents = [
  {
    name: 'Marin',
    assistantId: 'assistant_marin_id',
    videoUrl: '/videos/Marin.mp4',
    orientation: 'portrait',
  },
  {
    name: 'Max',
    assistantId: 'assistant_max_id',
    videoUrl: '/videos/Max.mp4',
    orientation: 'landscape',
  },
  {
    name: 'Logan',
    assistantId: 'assistant_logan_id',
    videoUrl: '/videos/Logan.mp4',
    orientation: 'landscape',
  },
  {
    name: 'Lumen',
    assistantId: 'assistant_lumen_id',
    videoUrl: '/videos/Lumen.mp4',
    orientation: 'landscape',
  },
  {
    name: 'Iris',
    assistantId: 'assistant_iris_id',
    videoUrl: '/videos/Iris.mp4',
    orientation: 'landscape',
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function AgentIntroCarousel() {
  const [index, setIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % agents.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (agent: typeof agents[number]) => {
    const res = await fetch(`${API_BASE_URL}/swarm/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.assistantId }),
    });
    const data = await res.json();
    if (data.id) {
      router.push(`/dashboard?swarmId=${data.id}`);
    } else {
      alert('⚠️ Failed to start swarm');
    }
  };

  const activeAgent = agents[index];
  const isPortrait = activeAgent.orientation === 'portrait';

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background Video */}
      <video
        key={`bg-${activeAgent.name}`}
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
          key={`fg-${activeAgent.name}`}
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
