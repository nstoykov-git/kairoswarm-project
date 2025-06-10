import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

const availableSkills = ['copywriting', 'python', 'design', 'strategy', 'marketing', 'llm-tuning'];

const ConciergePage = () => {
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [hasFreeTier, setHasFreeTier] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/agents/search?q=${encodeURIComponent(query)}`, {
          method: 'GET',
        });
        const data = await res.json();
        setAgents(data.agents);
        if (data.agents.length === 0) toast('No agents found');
      } catch (err) {
        toast.error('Search failed');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchAgents, 300);
    return () => clearTimeout(debounce);
  }, [query, skills, priceRange, hasFreeTier]);

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
    try {
      const res = await fetch('/swarm/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agent_ids: Array.from(selectedAgents) }),
      });
      const data = await res.json();
      toast.success(`Swarm ID: ${data.swarm_id}`);
    } catch (err) {
      toast.error('Failed to create swarm');
    }
  };

  return (
    <div className="p-6 space-y-4 bg-gray-900 text-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
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
              variant={skills.includes(skill) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading...</p>
        ) : (
          agents.map((agent) => (
            <Card
              key={agent.assistant_id}
              onClick={() => toggleSelect(agent.assistant_id)}
              className={`cursor-pointer ${selectedAgents.has(agent.assistant_id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardContent className="space-y-2 p-4">
                <h2 className="text-xl font-semibold">{agent.name}</h2>
                <p className="text-sm text-gray-400 line-clamp-3">{agent.description}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.map((skill: string) => (
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
