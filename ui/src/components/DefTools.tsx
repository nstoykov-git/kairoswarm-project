// src/components/DefTools.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import GoldbergTraits, { TraitResponse } from "@/components/GoldbergTraits";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

async function createAgent({
  name,
  userId,
  oceanScores,
  goldbergTraits,
  description,
  skills,
  userOpenAiKey,
}: {
  name: string;
  userId: string;
  oceanScores: Record<string, number>;
  goldbergTraits: { trait: string; score: number | null }[];
  description: string;
  skills: string[];
  userOpenAiKey?: string;
}) {
  const res = await fetch(`${API_BASE_URL}/swarm/create-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userOpenAiKey && { "X-OpenAI-Key": userOpenAiKey })
    },
    body: JSON.stringify({
      name,
      user_id: userId,
      ocean: oceanScores,
      goldberg_traits: goldbergTraits,
      description,
      skills
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create agent");
  }

  return await res.json();
}

export default function DefTools() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userOpenAiKey, setUserOpenAiKey] = useState("");
  const [agentName, setAgentName] = useState("");
  const [compileInput, setCompileInput] = useState("");
  const [personalStories, setPersonalStories] = useState("");
  const [economicConsiderations, setEconomicConsiderations] = useState("");
  const [etiquetteGuidelines, setEtiquetteGuidelines] = useState("");
  const [compiledMessage, setCompiledMessage] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  });

  const [showGoldberg, setShowGoldberg] = useState(false);
  const [goldbergResponses, setGoldbergResponses] = useState<TraitResponse[]>([]);
  const [tempGoldbergResponses, setTempGoldbergResponses] = useState<TraitResponse[]>([]);

  useEffect(() => {
    if (searchParams.get("success")) {
      setStatusMessage("✅ Subscription successful! You can now compile.");
      router.replace("/def-tools");
    }

    if (searchParams.get("canceled")) {
      setStatusMessage("❌ Subscription canceled. Please try again.");
      router.replace("/def-tools");
    }
  }, [searchParams, router]);

  const handleCompileWithTess = async () => {
    try {
      setCompiling(true);
      setCompiledMessage("");
      setStatusMessage(null);

      let token = localStorage.getItem("kairoswarm_token") || "";

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || "";
      }

      if (!token) {
        setStatusMessage("You must be signed in to compile with Tess.");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/payments/create-subscription-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          compile_instructions: compileInput,
          personal_stories: personalStories,
          economic_considerations: economicConsiderations,
          etiquette_guidelines: etiquetteGuidelines,
          profile,
          goldberg_responses: goldbergResponses,
          openai_key: userOpenAiKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Something went wrong.");
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.message) {
        setCompiledMessage(data.message);
        setStatusMessage("✅ Tess compiled your instructions!");
        return;
      }

      throw new Error("Unexpected response.");
    } catch (err: any) {
      console.error("Error during compile:", err);
      setStatusMessage(err.message || "Something went wrong.");
    } finally {
      setCompiling(false);
    }
  };

  const handleFreeCompile = () => {
    const freePrompt = `
Agent Name: ${compileInput || "Your Agent"}

You are an AI agent defined by the following personality profile. Please act in accordance with these traits and the provided verbal instructions.

Personality Profile:
- Openness: ${profile.openness}
- Conscientiousness: ${profile.conscientiousness}
- Extraversion: ${profile.extraversion}
- Agreeableness: ${profile.agreeableness}
- Neuroticism: ${profile.neuroticism}

Goldberg Traits:
${goldbergResponses.map(r => `${r.trait}: ${r.score === null ? "unknown" : r.score}`).join("\n")}

Personal Stories:
${personalStories || "None provided."}

Economic Considerations:
${economicConsiderations || "None provided."}

Etiquette Guidelines:
${etiquetteGuidelines || "None provided."}`;

    setCompiledMessage(freePrompt);
    setStatusMessage("✅ Basic system prompt generated.");
  };

  const profileData = [
    { trait: "Openness", value: profile.openness },
    { trait: "Conscientiousness", value: profile.conscientiousness },
    { trait: "Extraversion", value: profile.extraversion },
    { trait: "Agreeableness", value: profile.agreeableness },
    { trait: "Neuroticism", value: profile.neuroticism },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black">Agent Personality Builder</h1>
      <Button variant="secondary" onClick={() => router.push("/")}>⬅ Back to Dashboard</Button>

      {statusMessage && <p className="text-green-600 font-semibold mt-2">{statusMessage}</p>}

      <Input
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
        placeholder="Agent name"
        className="mt-4"
        required
      />

      {/* ... rest of the form unchanged ... */}

          <Button
            variant="default"
            onClick={async () => {
              try {
                const { data } = await supabase.auth.getSession();
                const userId = data.session?.user?.id;

                if (!userId) {
                  setStatusMessage("Please sign in to create your agent.");
                  return;
                }

                const oceanScores = {
                  openness: profile.openness,
                  conscientiousness: profile.conscientiousness,
                  extraversion: profile.extraversion,
                  agreeableness: profile.agreeableness,
                  neuroticism: profile.neuroticism
                };

                const agent = await createAgent({
                  name: agentName || "Unnamed Agent",
                  userId,
                  oceanScores,
                  goldbergTraits: goldbergResponses,
                  description: compiledMessage || "No description provided.",
                  skills: [],
                  userOpenAiKey
                });

                console.log(agent)
                setStatusMessage(`✅ Agent ${agent?.name || "Unnamed Agent"} created!`);
              } catch (err: any) {
                setStatusMessage(err.message || "Agent creation failed.");
              }
            }}
          >
            Save Agent
          </Button>

      {/* ... remaining JSX unchanged ... */}
    </div>
  );
}
