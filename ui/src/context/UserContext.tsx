"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  is_premium?: boolean;
};

type UserContextType = {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_MODAL_API_URL;

  async function fetchProfile(token: string) {
    const res = await fetch(`${API}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch profile");

    const { user_id, email, display_name, stripe_account_id, stripe_onboarding_complete, is_premium } = await res.json();
    setUser({ id: user_id, email, display_name, stripe_account_id, stripe_onboarding_complete, is_premium });
  }

  const loadUser = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      setUser(null);
      setLoading(false);
      // ✅ Clean the URL even if no session is found
      if (window.location.hash) {
        window.history.replaceState({}, document.title, "/");
      }
      return;
    }

    const token = data.session.access_token;
    try {
      await fetchProfile(token);
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser(null);
    }
    setLoading(false);

    // ✅ Clean the URL after session is confirmed
    if (window.location.hash) {
      window.history.replaceState({}, document.title, "/");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        try {
          await fetchProfile(session.access_token);
        } catch (err) {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      // ✅ Always clean the URL when auth state changes
      if (window.location.hash) {
        window.history.replaceState({}, document.title, "/");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
