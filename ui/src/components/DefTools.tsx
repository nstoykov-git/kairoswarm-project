// src/components/DefTools.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function DefTools() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [compileInput, setCompileInput] = useState('');
  const [personalStories, setPersonalStories] = useState('');
  const [economicConsiderations, setEconomicConsiderations] = useState('');
  const [etiquetteGuidelines, setEtiquetteGuidelines] = useState('');
  const [compiling, setCompiling] = useState(false);

  const [profile, setProfile] = useState({
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  });

  useEffect(() => {
    if (searchParams.get('success')) {
      toast.success('✅ Subscription successful! You can now compile.');
      router.replace('/def-tools');
    }

    if (searchParams.get('canceled')) {
      toast.error('❌ Subscription canceled. Please try again.');
      router.replace('/def-tools');
    }
  }, [searchParams, router]);

  const handleCompile = async () => {
    try {
      setCompiling(true);

      let token = localStorage.getItem('kairoswarm_token') || '';

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      if (!token) {
        toast.error('You must be signed in to compile.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/payments/create-subscription-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
        throw new Error(data.detail || 'Something went wrong.');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.status === 'compiled') {
        toast.success('✅ Compilation successful!');
        return;
      }

      throw new Error('Unexpected response.');
    } catch (err: any) {
      console.error('Error during compile:', err);
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setCompiling(false);
    }
  };

  const profileData = [
    { trait: 'Openness', value: profile.openness },
    { trait: 'Conscientiousness', value: profile.conscientiousness },
    { trait: 'Extraversion', value: profile.extraversion },
    { trait: 'Agreeableness', value: profile.agreeableness },
    { trait: 'Neuroticism', value: profile.neuroticism },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black">Agent Personality Builder</h1>
      <Button variant="secondary" onClick={() => router.push('/')}>⬅ Back to Dashboard</Button>

      <div className="space-y-4">
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

        {['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'].map((trait) => (
          <div key={trait} className="space-y-2">
            <label className="text-black capitalize">{trait}</label>
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
                <PolarAngleAxis dataKey="trait" />
                <PolarRadiusAxis angle={30} domain={[0, 1]} />
                <Radar name="Profile" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Button variant="secondary" onClick={handleCompile} disabled={compiling}>
          {compiling ? 'Compiling...' : 'Compile with Tess'}
        </Button>
      </div>
    </div>
  );
}
