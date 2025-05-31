// lib/useUser.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useUser() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session fetch error:", error.message);
        return;
      }
      const sessionUser = data.session?.user;
      if (sessionUser?.email && sessionUser.id) {
        const userData = { id: sessionUser.id, email: sessionUser.email };
        setUser(userData);
        localStorage.setItem("kairoswarm_user_id", sessionUser.id);
        localStorage.setItem("kairoswarm_user_email", sessionUser.email);
      }
    };

    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && session.user.id) {
        const userData = { id: session.user.id, email: session.user.email };
        setUser(userData);
        localStorage.setItem("kairoswarm_user_id", session.user.id);
        localStorage.setItem("kairoswarm_user_email", session.user.email);
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
