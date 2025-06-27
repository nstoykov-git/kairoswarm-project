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
  const [canceling, setCanceling] = useState(false);
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);

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

  useEffect(() => {
    fetchProfile();
  }, [router]);

  const startOnboarding = async () => {
    try {
      setOnboardingInProgress(true);
      let token = localStorage.getItem('kairoswarm_token') || '';

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      const res = await fetch(`${API_BASE_URL}/accounts/create-connect-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Onboarding failed.');
      }

      window.location.href = data.url; // Redirect to Stripe onboarding
    } catch (err: any) {
      console.error('Onboarding error:', err);
      toast.error(err.message || 'Onboarding failed.');
    } finally {
      setOnboardingInProgress(false);
    }
  };

  const refreshOnboarding = async () => {
    try {
      setOnboardingInProgress(true);
      let token = localStorage.getItem('kairoswarm_token') || '';

      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      const res = await fetch(`${API_BASE_URL}/accounts/refresh-onboarding-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Refresh failed.');
      }

      window.location.href = data.url; // Redirect to Stripe onboarding
    } catch (err: any) {
      console.error('Refresh error:', err);
      toast.error(err.message || 'Refresh failed.');
    } finally {
      setOnboardingInProgress(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
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
      await fetchProfile();
    } catch (err: any) {
      console.error('Cancellation error:', err);
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setCanceling(false);
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
          <Button variant="secondary" onClick={() => router.push('/profile/agents')}>
            🗂️ My Agents
          </Button>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your published agents.
          </p>
          <p>
            <strong>Developer Payouts:</strong> {userProfile.stripe_onboarding_complete ? '✅ Setup Complete' : '⚠️ Not Configured'}
          </p>

          {!userProfile.stripe_onboarding_complete && (
            <div className="space-y-2">
              <Button onClick={startOnboarding} disabled={onboardingInProgress}>
                {onboardingInProgress ? 'Redirecting...' : 'Start Developer Onboarding'}
              </Button>

              <Button variant="outline" onClick={refreshOnboarding} disabled={onboardingInProgress}>
                {onboardingInProgress ? 'Refreshing...' : 'Refresh Onboarding Link'}
              </Button>
            </div>
          )}

          {userProfile.is_premium && (
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={canceling}>
              {canceling ? 'Cancelling...' : 'Cancel Subscription'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
