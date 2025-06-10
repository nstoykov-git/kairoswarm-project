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
    // Exit early during SSR
    if (typeof window === "undefined") return;

    const loadUserProfile = async (userId: string, email: string) => {
      const { data, error } = await supabase
        .from("users")
        .select("display_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Failed to fetch profile:", error.message);
        return;
      }

      setUser({
        id: userId,
        email,
        display_name: data?.display_name ?? undefined,
      });
    };

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (sessionUser?.id && sessionUser?.email) {
        await loadUserProfile(sessionUser.id, sessionUser.email);
      } else {
        setUser(null);
        localStorage.removeItem("kairoswarm_user_id");
        localStorage.removeItem("kairoswarm_user_email");
      }
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user;
        if (user?.id && user.email) {
          await loadUserProfile(user.id, user.email);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return user;
}
