// src/components/DefTools.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function DefTools() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [compileInput, setCompileInput] = useState("");
  const [personalStories, setPersonalStories] = useState("");
  const [economicConsiderations, setEconomicConsiderations] = useState("");
  const [etiquetteGuidelines, setEtiquetteGuidelines] = useState("");
  const [compiledMessage, setCompiledMessage] = useState("");
  const [compiling, setCompiling] = useState(false);

  const [profile, setProfile] = useState({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  });

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("✅ Subscription successful! You can now compile.");
      router.replace("/def-tools");
    }

    if (searchParams.get("canceled")) {
      toast.error("❌ Subscription canceled. Please try again.");
      router.replace("/def-tools");
    }
  }, [searchParams, router]);

  const handleCompileWithTess = async () => {
    try {
      setCompiling(true);
      setCompiledMessage("");

      let token = localStorage.getItem("kairoswarm_token") || "";

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || "";
      }

      if (!token) {
        toast.error("You must be signed in to compile.");
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
        toast.success("✅ Tess compiled your instructions!");
        return;
      }

      throw new Error("Unexpected response.");
    } catch (err: any) {
      console.error("Error during compile:", err);
      toast.error(err.message || "Something went wrong.");
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

  Personal Stories:
  ${personalStories || "None provided."}

  Economic Considerations:
  ${economicConsiderations || "None provided."}

  Etiquette Guidelines:
  ${etiquetteGuidelines || "None provided."}
    `;

    setCompiledMessage(freePrompt);
    toast.success("✅ Basic system prompt generated.");
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
      <Button variant="secondary" onClick={() => router.push("/")}>
        ⬅ Back to Dashboard
      </Button>

      <div className="space-y-4">
        {["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"].map((trait) => (
          <div key={trait} className="space-y-2">
            <label className="text-black capitalize text-lg font-semibold">{trait}</label>
            <Slider
              value={[profile[trait as keyof typeof profile]]}
              onValueChange={([val]) => setProfile((prev) => ({ ...prev, [trait]: val }))}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        ))}

        <Card>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={profileData} outerRadius={100}>
                <PolarGrid />
                <PolarAngleAxis dataKey="trait" tick={{ fill: "black", fontSize: 12, fontWeight: "bold" }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} />
                <Radar name="Profile" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Input
          value={compileInput}
          onChange={(e) => setCompileInput(e.target.value)}
          placeholder="Enter compile instructions here..."
        />

        <Textarea
          value={personalStories}
          onChange={(e) => setPersonalStories(e.target.value)}
          placeholder="Enter personal stories..."
        />

        <Textarea
          value={economicConsiderations}
          onChange={(e) => setEconomicConsiderations(e.target.value)}
          placeholder="Enter economic considerations..."
        />

        <Textarea
          value={etiquetteGuidelines}
          onChange={(e) => setEtiquetteGuidelines(e.target.value)}
          placeholder="Enter etiquette guidelines..."
        />

        <div className="flex gap-4">
          <Button variant="secondary" onClick={handleCompileWithTess} disabled={compiling}>
            {compiling ? "Compiling with Tess..." : "Compile with Tess"}
          </Button>

          <Button variant="outline" onClick={handleFreeCompile}>
            Compile without Tess
          </Button>
        </div>

        {compiledMessage && (
          <Card className="bg-gray-800 text-white p-4 mt-4">
            <CardContent className="space-y-3">
              <div className="whitespace-pre-wrap">{compiledMessage}</div>
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(compiledMessage);
                  toast.success("System prompt copied!");
                }}
              >
                Copy System Prompt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
