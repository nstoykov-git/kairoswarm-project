// src/components/DefTools.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";

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

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("✅ Subscription activated! Please compile again.");
      router.replace("/def-tools");
    } else if (searchParams.get("canceled") === "true") {
      toast.error("❌ Subscription was canceled.");
      router.replace("/def-tools");
    }
  }, [searchParams, router]);

  const handleCompile = async () => {
    try {
      setCompiling(true);
      setCompiledMessage("");

      const token = localStorage.getItem("kairoswarm_user_token") || "";
      if (!token) {
        toast.error("You must be signed in to compile.");
        setCompiling(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/payments/create-subscription-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          compile_instructions: compileInput,
          personal_stories: personalStories,
          economic_considerations: economicConsiderations,
          etiquette_guidelines: etiquetteGuidelines,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unknown error occurred.");
      }

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else if (result.message) {
        setCompiledMessage(result.message);
        toast.success("✅ Compilation successful!");
      } else {
        toast.error("❌ Unexpected response.");
      }
    } catch (err) {
      console.error("Error during compile:", err);
      toast.error("❌ Compilation failed.");
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white mb-4">Agent Personality Builder</h1>

      <Input
        placeholder="Enter compile instructions..."
        value={compileInput}
        onChange={(e) => setCompileInput(e.target.value)}
      />

      <Input
        placeholder="Enter personal stories..."
        value={personalStories}
        onChange={(e) => setPersonalStories(e.target.value)}
      />

      <Input
        placeholder="Enter economic considerations..."
        value={economicConsiderations}
        onChange={(e) => setEconomicConsiderations(e.target.value)}
      />

      <Input
        placeholder="Enter etiquette guidelines..."
        value={etiquetteGuidelines}
        onChange={(e) => setEtiquetteGuidelines(e.target.value)}
      />

      <Button
        onClick={handleCompile}
        variant="secondary"
        className="w-full"
        disabled={compiling}
      >
        {compiling ? "Compiling..." : "Compile with Tess"}
      </Button>

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
  );
}
