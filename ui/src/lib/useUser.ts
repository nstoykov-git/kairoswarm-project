// lib/useUser.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
};

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadUserProfile = async (userId: string, email: string) => {
      const { data, error } = await supabase
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
      localStorage.setItem("kairoswarm_user_id", userId);
      localStorage.setItem("kairoswarm_user_email", email);
    };

    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session fetch error:", error.message);
        return;
      }
      const sessionUser = data.session?.user;
      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      }
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user;
      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      } else {
        setUser(null);
        localStorage.removeItem("kairoswarm_user_id");
        localStorage.removeItem("kairoswarm_user_email");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return user;
}
