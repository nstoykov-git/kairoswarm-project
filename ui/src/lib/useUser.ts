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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const syncSessionToProfile = async (session: any) => {
      const sessionUser = session?.user;
      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      } else {
        setUser(null);
        localStorage.removeItem("kairoswarm_user_id");
        localStorage.removeItem("kairoswarm_user_email");
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Session fetch error:", error.message);
        setLoading(false);
        return;
      }
      syncSessionToProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSessionToProfile(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
