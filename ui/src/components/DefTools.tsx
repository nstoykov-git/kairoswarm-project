"use client";

// src/components/DefTools.tsx
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { supabase } from "@/lib/supabase";

const traits = [
  { key: "openness", label: "Openness" },
  { key: "conscientiousness", label: "Conscientiousness" },
  { key: "extraversion", label: "Extraversion" },
  { key: "agreeableness", label: "Agreeableness" },
  { key: "neuroticism", label: "Neuroticism" },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function DefTools() {
  const router = useRouter();
  const [profile, setProfile] = useState({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    personalMemory: "",
    economicModel: "",
    etiquetteRules: "",
  });
  const [savedProfiles, setSavedProfiles] = useState<{ name: string; profile: typeof profile }[]>([]);
  const [newProfileName, setNewProfileName] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("success") === "true") {
      toast.success("🎉 Subscription Activated! You can now compile with Tess.");
    }

    if (urlParams.get("canceled") === "true") {
      toast.error("Subscription canceled. No worries—you can upgrade anytime!");
    }
  }, []);


  const handleChange = (key: string, value: number | string) => {
    setProfile({ ...profile, [key]: value });
  };

  const handleCompile = async () => {
    try {
      let token = localStorage.getItem("access_token");

      // If no manual token, try to get Supabase OAuth token
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || "";
      }

      if (!token) {
        alert("You are not logged in. Please sign in to continue.");
        return;
      }

      console.log("Using token:", token);

      // Step 1: Fetch user profile to check premium status
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();

      if (!user.is_premium) {
        console.log("Creating subscription session with token:", token);
        const checkoutRes = await fetch(`${API_BASE_URL}/payments/create-subscription-session`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const { checkout_url } = await checkoutRes.json();
        window.location.href = checkout_url;
        return;
      }

      const compileRes = await fetch(`${API_BASE_URL}/personalities/compile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile),
      });

      const { compiled_prompt } = await compileRes.json();
      alert(`Compiled Prompt:\n\n${compiled_prompt}`);

    } catch (err: any) {
      console.error("Error during compile:", err);

      if (err instanceof SyntaxError) {
        alert("Token is likely invalid or missing. Please sign in again.");
      } else if (err.message) {
        alert(`Error: ${err.message}`);
      } else {
        alert("Something went wrong. Please try again.");
      }
    }
  };

  const generatePrompt = () => {
    return `You are an AI agent with the following traits:
- Openness: ${profile.openness}
- Conscientiousness: ${profile.conscientiousness}
- Extraversion: ${profile.extraversion}
- Agreeableness: ${profile.agreeableness}
- Neuroticism: ${profile.neuroticism}

Personal Experience:
${profile.personalMemory || "[None Provided]"}

Economic Reasoning Model:
${profile.economicModel || "[None Provided]"}

Etiquette Rules:
${profile.etiquetteRules || "[None Provided]"}

Respond in a way that reflects this personality.`;
  };

  const saveProfile = () => {
    if (newProfileName.trim() !== "") {
      setSavedProfiles([...savedProfiles, { name: newProfileName, profile }]);
      setNewProfileName("");
    }
  };

  const loadProfile = (loaded: typeof profile) => {
    setProfile(loaded);
  };

  const chartData = traits.map(({ key, label }) => ({
    trait: label,
    value: (profile as any)[key],
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white bg-gray-800 p-4 rounded-xl">Agent Personality Builder</h1>
      <Button variant="secondary" onClick={() => router.push("/")}>⬅ Back to Dashboard</Button>

      <Card className="bg-gray-800 text-white">
        <CardContent className="space-y-6">
          {traits.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-white">{label}</span>
                <span className="text-white">{(profile as any)[key].toFixed(2)}</span>
              </div>
              <Slider
                defaultValue={[(profile as any)[key]]}
                max={1}
                step={0.01}
                onValueChange={([value]) => handleChange(key, value)}
              />
            </div>
          ))}

          <Textarea
            placeholder="Personal story or memory..."
            value={profile.personalMemory}
            onChange={(e) => handleChange("personalMemory", e.target.value)}
            className="text-white placeholder-gray-400"
          />
          <Textarea
            placeholder="Economic reasoning model..."
            value={profile.economicModel}
            onChange={(e) => handleChange("economicModel", e.target.value)}
            className="text-white placeholder-gray-400"
          />
          <Textarea
            placeholder="Etiquette rules..."
            value={profile.etiquetteRules}
            onChange={(e) => handleChange("etiquetteRules", e.target.value)}
            className="text-white placeholder-gray-400"
          />

          <Button className="w-full bg-blue-600 text-white" onClick={() => alert(generatePrompt())}>
            Generate Prompt
          </Button>
          <Button className="w-full bg-purple-600 text-white" onClick={handleCompile}>
            Compile with Tess
          </Button>

        </CardContent>
      </Card>

      <Card className="bg-gray-800 text-white">
        <CardContent className="space-y-4">
          <h2 className="text-xl font-semibold">Save/Load Profiles</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Profile name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="bg-white text-black dark:bg-gray-900 dark:text-white"
            />
            <Button onClick={saveProfile} className="bg-green-600 text-white">
              Save
            </Button>
          </div>
          <div className="space-y-2">
            {savedProfiles.map(({ name, profile: p }, idx) => (
              <Button key={idx} className="w-full bg-gray-700 text-white" onClick={() => loadProfile(p)}>
                Load: {name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 text-white">
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">5D Personality Visualization</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="trait" stroke="#ffffff" />
                <PolarRadiusAxis domain={[0, 1]} stroke="#ffffff" />
                <Radar name="Profile" dataKey="value" stroke="#00f6ff" fill="#00f6ff" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
