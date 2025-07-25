// src/components/GoldbergTraits.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export type TraitResponse = {
  trait: string;
  score: number | null;
};

const goldbergGrouped = [
  {
    domain: "Openness",
    traits: [
      "Creative", "Imaginative", "Innovative", "Intellectual", "Philosophical",
      "Insightful", "Curious", "Sophisticated", "Original", "Analytical",
      "Abstract", "Complex", "Wide interests", "Artistic", "Uncreative",
      "Unimaginative", "Unintellectual", "Uninformed", "Conventional"
    ]
  },
  {
    domain: "Conscientiousness",
    traits: [
      "Organized", "Systematic", "Neat", "Efficient", "Thorough", "Responsible",
      "Orderly", "Hardworking", "Practical", "Reliable", "Planful", "Tidy",
      "Persistent", "Self-disciplined", "Disorganized", "Careless",
      "Inefficient", "Lazy", "Sloppy", "Unsystematic"
    ]
  },
  {
    domain: "Extraversion",
    traits: [
      "Talkative", "Energetic", "Assertive", "Extraverted", "Enthusiastic",
      "Cheerful", "Lively", "Bold", "Sociable", "Active", "Full of pep",
      "Outgoing", "Expressive", "Quiet", "Shy", "Bashful", "Inhibited",
      "Withdrawn", "Timid", "Passive"
    ]
  },
  {
    domain: "Agreeableness",
    traits: [
      "Kind", "Cooperative", "Generous", "Pleasant", "Sympathetic",
      "Warm-hearted", "Trusting", "Compassionate", "Helpful", "Gentle",
      "Hostile", "Rude", "Angry", "Resentful", "Cold", "Harsh",
      "Unsympathetic", "Unkind", "Bothered", "Irritable"
    ]
  },
  {
    domain: "Neuroticism",
    traits: [
      "Anxious", "Tense", "Nervous", "Uneasy", "On edge", "Uptight", "Sad",
      "Depressed", "Fearful", "Distressed", "Worried", "Blue", "Tired",
      "Worn out", "Drowsy", "Sleepy", "Calm", "Relaxed", "Contented",
      "At ease"
    ]
  }
];

interface GoldbergTraitsProps {
  onChange: (responses: TraitResponse[]) => void;
  initialResponses?: TraitResponse[];
}

export default function GoldbergTraits({ onChange, initialResponses = [] }: GoldbergTraitsProps) {
  const flatTraits = goldbergGrouped.flatMap(group => group.traits);

  const [responses, setResponses] = useState<TraitResponse[]>(
    initialResponses.length > 0
      ? initialResponses
      : flatTraits.map(trait => ({ trait, score: null }))
  );

  useEffect(() => {
    onChange(responses);
  }, [responses, onChange]);

  const updateScore = (trait: string, value: number | null) => {
    setResponses(prev =>
      prev.map(r => (r.trait === trait ? { ...r, score: value } : r))
    );
  };

  return (
    <div className="space-y-6">
      {goldbergGrouped.map(group => (
        <div key={group.domain} className="space-y-4">
          <h2 className="text-xl font-semibold text-black">{group.domain}</h2>

          {group.traits.map(trait => {
            const response = responses.find(r => r.trait === trait);
            if (!response) return null;

            const score = response.score;

            return (
              <Card key={trait}>
                <CardContent className="py-4 px-6">
                  <div className="flex flex-col gap-2">
                    <Label className="text-md font-semibold text-black">{trait}</Label>

                    <div className="flex items-center justify-between gap-4">
                      <Slider
                        value={[score !== null ? score : 2]}
                        min={0}
                        max={4}
                        step={1}
                        disabled={score === null}
                        onValueChange={([val]) => updateScore(trait, val)}
                        className="flex-1"
                      />
                      <div className="w-24 text-right text-sm text-gray-600">
                        {score === null ? "Unknown" : `${score} / 4`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={score === null}
                        onChange={(e) => updateScore(trait, e.target.checked ? null : 2)}
                        className="h-4 w-4"
                      />
                      <label className="text-sm text-gray-600">Mark as Unknown</label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
