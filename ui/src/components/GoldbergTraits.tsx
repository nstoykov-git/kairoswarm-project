// src/components/GoldbergTraits.tsx

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export type TraitResponse = {
  trait: string;
  score: number | null;
};

interface GoldbergTraitsProps {
  onChange: (responses: TraitResponse[]) => void;
}

const goldbergItems: string[] = [
  "Sluggish", "Hostile", "Untalkative", "On Edge", "Anxious", "Generous", "Innovative", "Sad",
  "Introspective", "Organized", "Thorough", "Bashful", "Kind", "Unintellectual", "Lively", "Careless",
  "Touchy", "Shy", "Uncreative", "Happy", "Nervous", "Introverted", "Inhibited", "Resentful",
  "Tense", "Philosophical", "Unimaginative", "Cold", "Talkative", "Pleased", "Uninformed", "Full of pep",
  "Efficient", "Tired", "Rude", "Neat", "Sleepy", "Extraverted", "Cooperative", "Impractical",
  "Timid", "Creative", "Intellectual", "Unkind", "Angry", "Pleasant", "Fatigued", "Imaginative",
  "Relaxed", "Inefficient", "Unsympathetic", "Disorganized", "Unsystematic", "Sympathetic", "Intense", "Enthusiastic",
  "Cheerful", "Energetic", "Harsh", "Unenvious", "Quiet", "Systematic", "Depressed", "Unhappy",
  "Irritable", "Contented", "Vigorous", "Comfortable", "Uneasy", "Worried", "Distressed", "Uptight",
  "Drowsy", "Alert", "Bothered", "Aroused", "Active", "Calm", "Passive", "Worn Out",
  "Fearful", "Stimulated", "Bored", "Warm-hearted", "Inactive", "Blue", "At Ease", "Peppy"
];

export default function GoldbergTraits({ onChange }: GoldbergTraitsProps) {
  const [responses, setResponses] = useState<TraitResponse[]>(
    goldbergItems.map((trait) => ({ trait, score: null }))
  );

  useEffect(() => {
    onChange(responses);
  }, [responses, onChange]);

  const updateScore = (index: number, value: number | null) => {
    setResponses((prev) =>
      prev.map((r, i) => (i === index ? { ...r, score: value } : r))
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-black">Goldberg Adjective Trait Survey</h2>
      <p className="text-gray-600">Rate how accurately each word describes the simulated person.</p>

      <div className="grid gap-4 max-h-[600px] overflow-y-scroll pr-2">
        {responses.map((item, index) => (
          <Card key={index}>
            <CardContent className="py-4 px-6">
              <div className="flex flex-col gap-2">
                <Label className="text-lg font-semibold text-black">{item.trait}</Label>

                <div className="flex items-center justify-between gap-2">
                  <Slider
                    value={[item.score !== null ? item.score : 2]}
                    min={0}
                    max={4}
                    step={1}
                    disabled={item.score === null}
                    onValueChange={([val]) => updateScore(index, val)}
                    className="flex-1"
                  />
                  <div className="w-28 text-right text-sm text-gray-700">
                    {item.score === null ? "Unknown" : `${item.score} / 4`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.score === null}
                    onChange={(e) => updateScore(index, e.target.checked ? null : 2)}
                    className="h-4 w-4"
                  />
                  <label className="text-sm text-gray-600">Mark as Unknown</label>
                </div>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

