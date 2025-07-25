"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import GoldbergTraits from "@/components/GoldbergTraits";
import type { TraitResponse } from "@/components/GoldbergTraits";

export default function GoldbergTraitsPage() {
  const router = useRouter();
  const [responses, setResponses] = useState<TraitResponse[]>([]);

  const handleSave = () => {
    localStorage.setItem("goldberg_responses", JSON.stringify(responses));
    router.push("/def-tools");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black">Goldberg Trait Survey</h1>

      <Button variant="secondary" onClick={() => router.push("/def-tools")}>
        ⬅ Back to Builder
      </Button>

      <GoldbergTraits onChange={setResponses} />

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.push("/def-tools")}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Traits</Button>
      </div>
    </div>
  );
}

