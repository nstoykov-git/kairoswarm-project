"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

const availableSkills = ['copywriting', 'python', 'design', 'strategy', 'marketing', 'llm-tuning'];
const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

const ConciergePage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [hasFreeTier, setHasFreeTier] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        min_price: priceRange[0].toString(),
        max_price: priceRange[1].toString(),
        has_free_tier: hasFreeTier.toString(),
        skills: skills.join(',')
      });

      const res = await fetch(`${API_BASE_URL}/swarm/agents/search?${params.toString()}`, {
        method: 'GET'
      });
      const data = await res.json();
      console.log('Loaded agents:', data.agents);
      setAgents(data.agents);
      if (data.agents.length === 0) toast('No agents found');
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

const handleHire = async () => {
  const selected = agents.filter(a => selectedAgents.has(a.id));
  const total = selected.reduce((sum, a) => sum + a.price, 0); // price in cents

  toast(`Estimated price at checkout: $${(total / 100).toFixed(2)}`, { icon: '💵' });

  if (total === 0) {
    const res = await fetch(`${API_BASE_URL}/swarm/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_ids: selected.map(a => a.id) }),
    });
    const data = await res.json();
    toast.success(`Your free swarm is ready! ID: ${data.swarm_id}`);
    router.push(`/dashboard?swarm_id=${data.swarm_id}`);
  } else {
    router.push(`/payment-review?agent_ids=${Array.from(selectedAgents).join(",")}`);
  }
};

  return (
    <div className="p-6 space-y-4 bg-gray-900 text-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
        <Input
          placeholder="Search agents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-col space-y-1 w-full max-w-xs">
          <label className="text-sm text-gray-300">Price Range</label>
          <Slider
            defaultValue={[0, 100]}
            max={100}
            step={5}
            onValueChange={(val) => setPriceRange([val[0], val[1]])}
          />
          <div className="flex justify-between text-sm text-gray-400">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={hasFreeTier}
            onChange={(e) => setHasFreeTier(e.target.checked)}
          />
          <span>Free Tier</span>
        </label>
        <div className="flex flex-wrap gap-1">
          {availableSkills.map((skill) => (
            <Badge
              key={skill}
              className={`cursor-pointer ${
                skills.includes(skill)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-800 text-gray-200 border-gray-600'
              }`}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </Badge>

          ))}
        </div>
        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
          Search
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading...</p>
        ) : (
          agents.map((agent) => (
            <Card
              key={agent.id}
              onClick={() => toggleSelect(agent.id)}
              className={`cursor-pointer ${selectedAgents.has(agent.id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardContent className="space-y-2 p-4">
                <h2 className="text-xl font-semibold">{agent.name}</h2>
                <p className="text-sm text-gray-400 line-clamp-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(agent.skills ?? []).map((skill: string) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">${agent.price}</span>
                  <div className="flex gap-1">
                    {agent.has_free_tier && <Badge variant="secondary">Free Tier</Badge>}
                    {agent.is_negotiable && <Badge variant="outline">Negotiable</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedAgents.size > 0 && (
        <div className="fixed bottom-4 right-4">
          <Button onClick={handleHire} className="text-white bg-blue-600 hover:bg-blue-700">
            Hire {selectedAgents.size} Agent(s)
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConciergePage;
