// src/components/SingleAgentFromSwarm.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

const VIDEO_MAP: Record<string, { videoUrl: string; orientation: 'portrait' | 'landscape' }> = {
  'Marin': { videoUrl: '/videos/Marin.mp4', orientation: 'landscape' },
  'Max': { videoUrl: '/videos/Max.mp4', orientation: 'landscape' },
  'Logan': { videoUrl: '/videos/Logan.mp4', orientation: 'landscape' },
  'Lumen': { videoUrl: '/videos/Lumen.mp4', orientation: 'landscape' },
  'Iris': { videoUrl: '/videos/Iris.mp4', orientation: 'landscape' },
};

export default function SingleAgentFromSwarm() {
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const swarmId = searchParams?.get("swarm_id") || "";

  const [agent, setAgent] = useState<{ id: string; name: string; videoUrl: string; orientation: 'portrait' | 'landscape' } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!swarmId) return;

    const fetchData = async () => {
      try {
        // Fetch participants and tape (dashboard style)
        const [tapeRes, participantsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/tape?swarm_id=${swarmId}`),
          fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`)
        ]);

        const participantsData = await participantsRes.json();

        // Reload agents (dashboard style)
        for (const p of participantsData) {
          if (p.type === "agent") {
            await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                swarm_id: swarmId,
                agent_id: p.metadata?.agent_id || p.id,
              }),
            });
          }
        }

        // Pick the first agent
        const agentParticipant = participantsData.find((p: any) => p.type === "agent");
        if (agentParticipant && VIDEO_MAP[agentParticipant.name]) {
          setAgent({
            id: agentParticipant.metadata?.agent_id || agentParticipant.id,
            name: agentParticipant.name,
            videoUrl: VIDEO_MAP[agentParticipant.name].videoUrl,
            orientation: VIDEO_MAP[agentParticipant.name].orientation
          });
        }
      } catch (err) {
        console.error("Error loading swarm data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [swarmId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-xl animate-pulse">Loading agent...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-lg">No agent found in this swarm.</span>
      </div>
    );
  }

  const isPortrait = agent.orientation === "portrait";

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Background Video */}
      <video
        key={`bg-${agent.id}`}
        src={agent.videoUrl}
        className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Foreground Video */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <video
          key={`fg-${agent.id}`}
          src={agent.videoUrl}
          className={`rounded-xl shadow-2xl object-cover ${
            isPortrait
              ? 'h-full w-auto object-top transform scale-150'
              : 'w-full max-w-screen-xl'
          }`}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute bottom-24 text-center">
          <h1 className="text-white text-4xl font-semibold mb-2 drop-shadow-lg">
            {agent.name}
          </h1>
          <button
            onClick={() => router.push(`/dashboard?swarm_id=${swarmId}`)}
            className="text-white text-lg underline hover:opacity-80"
          >
            Talk to me
          </button>
        </div>
      </div>
    </div>
  );
}
