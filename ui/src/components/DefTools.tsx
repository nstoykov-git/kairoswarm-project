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
import GoldbergTraits, { TraitResponse } from "@/components/GoldbergTraits";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

// ✅ Control function schema
const AGENT_CONTROL_SCHEMA = [
  {
    type: "function",
    function: {
      name: "mouse_move",
      description: "Move the mouse pointer to the specified screen coordinates.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "integer", description: "X coordinate on the screen." },
          y: { type: "integer", description: "Y coordinate on the screen." }
        },
        required: ["x", "y"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mouse_click",
      description: "Click the mouse at the current pointer location.",
      parameters: {
        type: "object",
        properties: {
          button: {
            type: "string",
            enum: ["left", "right", "middle"],
            default: "left",
            description: "Which mouse button to click."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "key_press",
      description: "Press a key on the keyboard.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The key to press, e.g. 'enter', 'a', 'ctrl+c'." }
        },
        required: ["key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "take_screenshot",
      description: "Capture the current screen and return an image URL.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

async function createAgent({
  name,
  userId,
  oceanScores,
  goldbergTraits,
  personalStories,
  economicConsiderations,
  etiquetteGuidelines,
  description,
  skills,
  creatorEmail,
  allowUserContact,
  contactMode,
  videoUrl,
  mediaMimeType,
  voice,              // ✅ voice prop
  //functions,          // ✅ control schema prop
}: {
  name: string;
  userId: string;
  oceanScores: Record<string, number>;
  goldbergTraits: { trait: string; score: number | null }[];
  personalStories?: string;
  economicConsiderations?: string;
  etiquetteGuidelines?: string;
  description: string;
  skills: string[];
  creatorEmail?: string;
  allowUserContact: boolean;
  contactMode: "summary" | "verbatim";
  videoUrl?: string | null;
  mediaMimeType?: string | null;
  voice: string;
  //functions?: any[];
}) {
  const res = await fetch(`${API_BASE_URL}/swarm/create-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      user_id: userId,
      ocean: oceanScores,
      goldberg_traits: goldbergTraits,
      personal_stories: personalStories,
      economic_considerations: economicConsiderations,
      etiquette_guidelines: etiquetteGuidelines,
      description,
      skills,
      creator_email: creatorEmail,
      allow_user_contact: allowUserContact,
      contact_mode: contactMode,
      video_url: videoUrl || null,
      media_mime_type: mediaMimeType || null,
      voice,              // ✅ include voice
      //functions,          // ✅ include control schema
    }),
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

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [agentName, setAgentName] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [allowUserContact, setAllowUserContact] = useState(false);
  const [contactMode, setContactMode] = useState<"summary" | "verbatim">("summary");
  const [agentDescription, setAgentDescription] = useState("");
  const [compileInput, setCompileInput] = useState("");
  const [personalStories, setPersonalStories] = useState("");
  const [economicConsiderations, setEconomicConsiderations] = useState("");
  const [etiquetteGuidelines, setEtiquetteGuidelines] = useState("");
  const [compiledMessage, setCompiledMessage] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [agentID, setAgentID] = useState("");
  const [launching, setLaunching] = useState(false);

  // ✅ voice selector state
  const [selectedVoice, setSelectedVoice] = useState("coral");
  const AVAILABLE_VOICES = ["coral", "nova", "alloy", "verse", "ballad"];

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
        toast.error("You must be signed in to compile with Tess.");
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
Agent Name: ${agentName || "Your Agent"}

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
      <Button variant="secondary" onClick={() => router.push("/")}>⬅ Back to Dashboard</Button>

      <label className="text-black font-semibold text-lg">Agent Name (required)</label>
      <Input
        value={agentName}
        onChange={(e) => setAgentName(e.target.value)}
        placeholder="Agent name"
        className="mt-2"
        required
      />

      {/* ✅ Insert this video upload block here */}
      <div className="space-y-2 mt-4">
        <label className="text-black font-semibold text-lg">Agent Video (optional)</label>
        <input
          type="file"
          accept="video/mp4,image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 10 * 1024 * 1024) {
                toast.error("File must be under 10MB.");
                return;
              }

              const allowedTypes = [
                "video/mp4",
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif",
              ];

              if (!allowedTypes.includes(file.type)) {
                toast.error("Only MP4 videos or common image formats are allowed.");
                return;
              }

              setVideoFile(file);
            }
          }}
        />

        {videoFile && (
          videoFile.type.startsWith("video/") ? (
            <video
              src={URL.createObjectURL(videoFile)}
              controls
              className="w-full max-w-md mt-2 rounded"
            />
          ) : (
            <img
              src={URL.createObjectURL(videoFile)}
              alt="Agent preview"
              className="w-full max-w-md mt-2 rounded"
            />
          )
        )}

      </div>

      <label className="text-black font-semibold text-lg mt-4">Creator Email (optional, to receive contact requests)</label>
      <Input
        value={creatorEmail}
        onChange={(e) => setCreatorEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-2"
      />

      <label className="text-black font-semibold text-lg mt-4">Agent Description (public, for marketplace)</label>
      <Textarea
        value={agentDescription}
        onChange={(e) => setAgentDescription(e.target.value)}
        placeholder="Write a short, human-facing description of your agent..."
        className="mt-2"
      />
      <p className="text-sm text-gray-600">
        Write 2–4 sentences that describe your agent’s vibe. 
        Think of it as introducing a friend: highlight personality, 
        add a vivid detail, and show how conversations with them feel. 
        Avoid technical words like “AI” or “agent.”
      </p>

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

        <Button variant="outline" onClick={() => {
          setTempGoldbergResponses(goldbergResponses);
          setShowGoldberg(true);
        }}>Add Goldberg Traits</Button>

        {showGoldberg && (
          <div className="border rounded-xl p-4 space-y-4 bg-white">
            <h2 className="text-xl font-bold text-black">Goldberg Trait Survey</h2>
            <GoldbergTraits onChange={setTempGoldbergResponses} initialResponses={tempGoldbergResponses} />
            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={() => setShowGoldberg(false)}>Cancel</Button>
              <Button onClick={() => {
                setGoldbergResponses(tempGoldbergResponses);
                setShowGoldberg(false);
              }}>OK</Button>
            </div>
          </div>
        )}

        <Input
          value={compileInput}
          onChange={(e) => setCompileInput(e.target.value)}
          placeholder="Enter compile instructions here..."
        />

        <Textarea
          value={personalStories || ""}
          onChange={(e) => setPersonalStories(e.target.value)}
          placeholder="Enter personal stories..."
        />

        <Textarea
          value={economicConsiderations || ""}
          onChange={(e) => setEconomicConsiderations(e.target.value)}
          placeholder="Enter economic considerations..."
        />

        <Textarea
          value={etiquetteGuidelines || ""}
          onChange={(e) => setEtiquetteGuidelines(e.target.value)}
          placeholder="Enter etiquette guidelines..."
        />

        <div className="flex flex-wrap gap-4">
{/*}          <Button variant="secondary" onClick={handleCompileWithTess} disabled={compiling}>
            {compiling ? "Compiling with Tess..." : "Compile with Tess"}
          </Button>

          <Button variant="outline" onClick={handleFreeCompile}>
            Compile without Tess
          </Button>
*/}

          <div className="mt-4 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowUserContact}
                onChange={() => setAllowUserContact(!allowUserContact)}
              />
              Allow users to contact me via email
            </label>

            {allowUserContact && (
              <div>
                <label className="text-black font-medium text-sm">Contact Mode</label>
                <select
                  value={contactMode}
                  onChange={(e) => setContactMode(e.target.value as "summary" | "verbatim")}
                  className="mt-1 border p-2 rounded text-sm"
                >
                  <option value="summary">Summary</option>
                  <option value="verbatim">Verbatim Transcript</option>
                </select>
              </div>
            )}
          </div>

          {!agentName.trim() && (
            <p className="text-red-500 text-sm">Please enter a name for your agent.</p>
          )}
          <Button
            variant="default"
            disabled={!agentName.trim() || launching}
            onClick={async () => {
              try {
                const { data } = await supabase.auth.getSession();
                const userId = data.session?.user?.id;

                if (!userId) {
                  toast.error("Please sign in to create your agent.");
                  return;
                }

                let uploadedVideoUrl: string | null = null;
                let uploadedMimeType: string | null = null;

                // ✅ Step 1: Upload video first (if selected)
                if (videoFile) {
                  const formData = new FormData();
                  formData.append("user_id", userId);
                  formData.append("agent_name", agentName);
                  formData.append("video", videoFile);

                  const uploadRes = await fetch(`${API_BASE_URL}/swarm/upload-agent-video`, {
                    method: "POST",
                    body: formData,
                  });

                  if (!uploadRes.ok) {
                    const err = await uploadRes.json();
                    throw new Error(err.detail || "Video upload failed");
                  }

                  const uploadData = await uploadRes.json();
                  uploadedVideoUrl = uploadData.public_url || null;
                  uploadedMimeType = uploadData.mime_type || null;
                }

                const oceanScores = {
                  openness: profile.openness,
                  conscientiousness: profile.conscientiousness,
                  extraversion: profile.extraversion,
                  agreeableness: profile.agreeableness,
                  neuroticism: profile.neuroticism,
                };

                // ✅ Step 2: Create agent with video_url + mime_type
                const agent = await createAgent({
                  name: agentName || "Unnamed Agent",
                  userId,
                  oceanScores,
                  goldbergTraits: goldbergResponses,
                  personalStories,
                  economicConsiderations,
                  etiquetteGuidelines,
                  description: agentDescription || null,
                  creatorEmail,
                  allowUserContact,
                  contactMode,
                  videoUrl: uploadedVideoUrl,       // NEW
                  mediaMimeType: uploadedMimeType,  // NEW
                } as any);

                setAgentID(agent?.agent_id || "");
                toast.success(`Agent ${agent?.name || "Unnamed Agent"} created!`);
              } catch (err: any) {
                toast.error(err.message || "Agent creation failed.");
              }
            }}
          >
            Create Agent
          </Button>

        </div>

        {compiledMessage && (
          <Card className="bg-gray-800 text-white p-4 mt-4">
            <CardContent className="space-y-3">
              <div className="whitespace-pre-wrap">{compiledMessage}</div>
              <Button variant="secondary" onClick={() => {
                navigator.clipboard.writeText(compiledMessage);
                toast.success("System prompt copied!");
              }}>
                Copy System Prompt
              </Button>
            </CardContent>
          </Card>
        )}

        {agentID && (
          <>
            <Card className="bg-white text-black p-4 mt-4 border">
              <CardContent className="space-y-3">
                <div>
                  <strong title="Use it to add to swarms or publish on Kairoswarm">
                    Assistant ID:
                  </strong> {agentID}
                </div>
                <Button variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(agentID);
                  toast.success("Agent ID copied!");
                }}>
                  Copy Assistant ID
                </Button>
              </CardContent>
            </Card>

            <Button
              variant="default"
              disabled={launching}
              className="mt-4"
              onClick={async () => {
                setLaunching(true);
                try {
                  // 1. Create ephemeral swarm
                  const createRes = await fetch(`${API_BASE_URL}/swarm/create`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: agentName || "Unnamed Swarm" }),
                  });

                  const createData = await createRes.json();
                  const swarmId = createData.id;

                  if (!swarmId) throw new Error("No swarm ID returned");

                  // 2. Add assistant (OpenAI) to swarm
                  const addRes = await fetch(`${API_BASE_URL}/swarm/add-agent`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ swarm_id: swarmId, agentId: agentID }),
                  });

                  const addData = await addRes.json();

                  if (addData?.error) {
                    throw new Error(addData.error || "Agent failed to join swarm");
                  }

                  // 3. Redirect to swarm
                  //router.push(`/?swarm_id=${swarmId}`);
                  // ✅ Robust redirect
                  window.location.href = `https://kairoswarm.com/?swarm_id=${swarmId}`;
                } catch (err) {
                  console.error(err);
                  toast.error("⚠️ Failed to meet agent");
                } finally {
                  setLaunching(false);
                }
              }}
            >
              {launching ? "🚀 Launching..." : "🚀 Meet Agent"}
            </Button>
          </>
        )}

      </div>
    </div>
  );
}
