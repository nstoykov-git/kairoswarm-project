"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

const VIDEO_MAP = {
  Marin: { videoUrl: "/videos/Marin.mp4", orientation: "landscape" },
  Max: { videoUrl: "/videos/Max.mp4", orientation: "landscape" },
  Logan: { videoUrl: "/videos/Logan.mp4", orientation: "landscape" },
  Lumen: { videoUrl: "/videos/Lumen.mp4", orientation: "landscape" },
  Iris: { videoUrl: "/videos/Iris.mp4", orientation: "landscape" },
} as const;

type AgentVideoKey = keyof typeof VIDEO_MAP;
type Agent = {
  id: string;
  name: AgentVideoKey;
  videoUrl: string;
  orientation: "portrait" | "landscape";
};

type RawAgent = { id: string; name: string };

export default function GiftAgentIntro() {
  const { agentName } = useParams<{ agentName: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If agentName is missing or not a string, set loading to false
    if (!agentName || typeof agentName !== "string") {
      setAgent(null);
      setLoading(false);
      return;
    }

    const fetchAgent = async () => {
      try {
        const res = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-names`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [agentName] }),
        });
        const data = await res.json();

        if (data.agents?.length) {
          const a: RawAgent = data.agents[0];
          if (a && a.name in VIDEO_MAP) {
            const key = a.name as AgentVideoKey;
            setAgent({
              id: a.id,
              name: key,
              videoUrl: VIDEO_MAP[key].videoUrl,
              orientation: VIDEO_MAP[key].orientation,
            });
          } else {
            setAgent(null);
            console.warn(`Agent '${a?.name}' not found in VIDEO_MAP.`);
          }
        } else {
          setAgent(null);
          console.warn("No agent found with the given name");
        }
      } catch (err) {
        setAgent(null);
        console.error("Failed to load agent", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentName]);

  const handleCheckout = () => {
    if (agent?.id) {
      router.push(`/concierge?gift=true&agent_id=${agent.id}`);
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
              ? "h-full w-auto object-top transform scale-150"
              : "w-full max-w-screen-xl"
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
            onClick={handleCheckout}
            className="text-white text-lg underline hover:opacity-80"
          >
            Talk to me
          </button>
        </div>
      </div>
    </div>
  );
}
