// lib/useUser.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string;
  display_name?: string;
};

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

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
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Session fetch error:", error.message);
        return;
      }
      syncSessionToProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          const { data } = await supabase.auth.getSession();
          session = data.session ?? null;
        }
        await syncSessionToProfile(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return user;
}
