import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

const availableSkills = ['copywriting', 'python', 'design', 'strategy', 'marketing', 'llm-tuning'];

const ConciergePage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [hasFreeTier, setHasFreeTier] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [swarmId, setSwarmId] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        min_price: priceRange[0].toString(),
        max_price: priceRange[1].toString(),
        has_free_tier: hasFreeTier.toString(),
      });
      const res = await fetch(`/swarm/agents/search?${params}`, { method: 'GET' });
      const data = await res.json();
      setAgents(data.agents);
      if (data.agents.length === 0) toast('No agents found');
    } catch (e) {
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
    setSkills((prev) => (prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]));
  };

  const handleHire = async () => {
    if (selectedAgents.size === 0) return toast.error('Select at least one agent');
    try {
      const res = await fetch(`/swarm/initiate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ agent_ids: Array.from(selectedAgents) }),
      });
      const data = await res.json();
      if (data.swarm_id) {
        toast.success('Swarm created!');
        setSwarmId(data.swarm_id);
        // Redirect to dashboard
        router.push(`/dashboard?swarm_id=${data.swarm_id}`);
      } else {
        toast.error('Failed to create swarm');
      }
    } catch (e) {
      toast.error('Failed to create swarm');
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gray-900 text-white min-h-screen">
      {/* Search / Filters */}
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
        {/* ... existing UI ... */}
        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
          Search
        </Button>
      </div>

      {/* Found Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading...</p>
        ) : (
          agents.map(agent => (
            <Card key={agent.id} onClick={() => toggleSelect(agent.id)} 
              className={`cursor-pointer ${selectedAgents.has(agent.id) ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="space-y-2 p-4">
                <h2 className="text-xl font-semibold">{agent.name}</h2>
                <p className="text-sm text-gray-400 line-clamp-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.map((s:string) => <Badge key={s}>{s}</Badge>)}
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
        )))}
      </div>

      {/* Hire Button */}
      {selectedAgents.size > 0 && (
        <div className="fixed bottom-4 right-4">
          <Button onClick={handleHire} className="text-white bg-blue-600 hover:bg-blue-700">
            Hire {selectedAgents.size} Agent(s)
          </Button>
        </div>
      )}

      {/* Confirmation UI (optional) */}
      {!!swarmId && (
        <div className="fixed bottom-24 right-4 p-4 bg-gray-800 rounded shadow-lg">
          <p className="mb-2">✅ Your swarm is ready!</p>
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/dashboard?swarm_id=${swarmId}`)}>View Swarm</Button>
            <Button variant="outline" onClick={() => setSwarmId(null)}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciergePage;
