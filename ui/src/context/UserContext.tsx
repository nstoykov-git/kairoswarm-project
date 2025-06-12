"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
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

  const fetchProfile = async (accessToken: string) => {
    const res = await fetch("/auth/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error("Failed to fetch user profile");

    const profile = await res.json();
    setUser(profile);
  };

  const loadUser = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      setUser(null);
      setLoading(false);
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
