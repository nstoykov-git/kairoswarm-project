"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  video_url?: string;
  media_mime_type?: string;
  orientation: "portrait" | "landscape";
}

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

// Gradients to choose from
const GRADIENTS = [
  ["from-pink-800", "to-purple-900"],
  ["from-indigo-900", "to-blue-800"],
  ["from-teal-900", "to-emerald-800"],
  ["from-amber-900", "to-red-800"],
  ["from-sky-900", "to-cyan-800"],
  ["from-fuchsia-900", "to-rose-800"],
];

function gradientForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function SingleAgentIntro({ agentName }: { agentName: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentName) return;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-names`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [agentName] }),
        });
        const data = await res.json();
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          const a = data.agents[0];
          setAgent({
            id: a.id,
            name: a.name,
            video_url: a.video_url || undefined,
            media_mime_type: a.media_mime_type || undefined,
            orientation: a.orientation || "landscape",
          });
        }
      } catch (err) {
        console.error("Failed to fetch agent", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [agentName]);

  const handleSelect = async (agent: Agent) => {
    try {
      const res = await fetch(`${API_INTERNAL_URL}/swarm/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_ids: [agent.id] }),
      });

      const data = await res.json();
      if (!data.swarm_id) throw new Error("No swarm_id returned");

      window.location.href = `https://kairoswarm.com/?swarm_id=${data.swarm_id}`;
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to initiate swarm");
    }
  };

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
        <span className="text-lg">Agent not found.</span>
      </div>
    );
  }

  const isPortrait = agent.orientation === "portrait";
  const hasMedia = agent.video_url && agent.media_mime_type;
  const [fromColor, toColor] = gradientForName(agent.name);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden animate-fadeIn">
      {/* Background */}
      {hasMedia ? (
        agent.media_mime_type!.startsWith("video/") ? (
          <video
            src={agent.video_url}
            className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={agent.video_url}
            className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
          />
        )
      ) : (
        <div
          className={`absolute w-full h-full bg-gradient-to-br ${fromColor} ${toColor} filter blur-2xl brightness-75`}
        />
      )}

      {/* Foreground */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {hasMedia ? (
          agent.media_mime_type!.startsWith("video/") ? (
            <video
              src={agent.video_url}
              className={`rounded-xl shadow-2xl object-cover ${
                isPortrait
                  ? "h-full w-auto object-top transform scale-150"
                  : "w-full max-w-screen-xl"
              }`}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={agent.video_url}
              className={`rounded-xl shadow-2xl object-cover ${
                isPortrait
                  ? "h-full w-auto object-top transform scale-150"
                  : "w-full max-w-screen-xl"
              }`}
            />
          )
        ) : (
          <div
            className={`rounded-xl shadow-2xl flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} text-white text-3xl font-semibold ${
              isPortrait
                ? "h-full w-auto px-12 py-24"
                : "w-full max-w-screen-xl h-96"
            }`}
          >
            {agent.name}
          </div>
        )}

        <div className="absolute bottom-24 text-center">
          <h1 className="text-white text-4xl font-semibold mb-2 drop-shadow-lg">
            {agent.name}
          </h1>
          <button
            onClick={() => handleSelect(agent)}
            className="text-white text-lg underline hover:opacity-80"
          >
            Talk to me
          </button>
        </div>
      </div>
    </div>
  );
}

