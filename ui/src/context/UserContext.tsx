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
  signOut: async () => {}, // 👈 dummy implementation for default context
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
  await supabase.auth.signOut();
  setUser(null);
  };

  const loadUserProfile = async (userId: string, email: string) => {
    const { data } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", userId)
      .single();

    const profile: UserProfile = {
      id: userId,
      email,
      display_name: data?.display_name ?? undefined,
    };

    setUser(profile);
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      }
      setLoading(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user;
      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      } else {
        setUser(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);

