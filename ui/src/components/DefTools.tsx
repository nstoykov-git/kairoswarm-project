// src/components/DefTools.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function DefTools() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [compileInput, setCompileInput] = useState('');
  const [compiling, setCompiling] = useState(false);

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
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Something went wrong.');
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      // If no checkout_url, the user is already subscribed
      const compileRes = await fetch(`${API_BASE_URL}/personalities/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ input: compileInput }),
      });

      const compileData = await compileRes.json();

      if (!compileRes.ok) {
        throw new Error(compileData.detail || 'Compilation failed.');
      }

      toast.success('✅ Compilation successful!');
    } catch (err: any) {
      console.error('Error during compile:', err);
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setCompiling(false);
    }
  };

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

        <Button variant="secondary" onClick={handleCompile} disabled={compiling}>
          {compiling ? 'Compiling...' : 'Compile with Tess'}
        </Button>
      </div>
    </div>
  );
}
