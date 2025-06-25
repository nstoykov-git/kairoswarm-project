// src/app/profile/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      let token = localStorage.getItem('kairoswarm_token') || '';

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      if (!token) {
        toast.error('You must be signed in.');
        router.push('/auth');
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.detail || 'Failed to fetch profile.');
        }

        setUserProfile(data);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        toast.error(err.message || 'Failed to fetch profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleCancelSubscription = async () => {
    try {
      let token = localStorage.getItem('kairoswarm_token') || '';

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      if (!token) {
        toast.error('You must be signed in.');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/payments/cancel-subscription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Cancellation failed.');
      }

      toast.success('✅ Subscription canceled.');
      router.refresh();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      toast.error(err.message || 'Something went wrong.');
    }
  };

  if (loading) {
    return <div className="p-6 text-black">Loading profile...</div>;
  }

  return (
    <div className="p-6 space-y-6 text-black">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <Button variant="secondary" onClick={() => router.push('/')}>
        ⬅ Back to Dashboard
      </Button>

      {userProfile && (
        <div className="space-y-4">
          <p>
            <strong>Email:</strong> {userProfile.email}
          </p>
          <p>
            <strong>Display Name:</strong> {userProfile.display_name}
          </p>
          <p>
            <strong>Premium:</strong> {userProfile.is_premium ? 'Yes' : 'No'}
          </p>

          {userProfile.is_premium && (
            <Button variant="destructive" onClick={handleCancelSubscription}>
              Cancel Subscription
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
