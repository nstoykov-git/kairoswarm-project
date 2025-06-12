// src/app/auth/page.tsx

"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  const router = useRouter();

  // ✅ Auto-redirect when user is authenticated
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        router.push("/");
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.push("/");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleAuth = async () => {
    setMessage("");

    const endpoint = mode === "sign-in" ? "/auth/signin" : "/auth/signup";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MODAL_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "❌ Something went wrong");
        return;
      }

      if (mode === "sign-in") {
        if (!data.access_token || !data.refresh_token) {
          setMessage("❌ Missing tokens in response");
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          setMessage("❌ Failed to persist session.");
          return;
        }
        router.refresh();
      }

      localStorage.setItem("kairoswarm_user_id", data.user_id);
      localStorage.setItem("kairoswarm_user_email", data.email);

      setMessage("✅ Signed in!");
    } catch (err) {
      console.error("❌ Auth error:", err);
      setMessage("❌ Network error. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Welcome to Kairoswarm</h1>
      <p className="text-gray-400 text-sm text-center">
        Sign in to persist your swarms and access personalized agents
      </p>

      <div className="space-y-3 w-80">
        {mode === "sign-up" && (
          <Input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-2">
          <Button className="flex-1" variant="secondary" onClick={handleAuth}>
            {mode === "sign-in" ? "Sign In" : "Sign Up"}
          </Button>
          <Button
            className="text-xs"
            variant="ghost"
            onClick={() =>
              setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))
            }
          >
            Switch to {mode === "sign-in" ? "Sign Up" : "Sign In"}
          </Button>
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            const redirectTo =
              typeof window !== "undefined" && window.location.origin
                ? window.location.origin
                : "https://kairoswarm.nextminds.network";

            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo },
            });

            if (error) {
              setMessage("Google sign-in failed: " + error.message);
            }
          }}
        >
          Sign in with Google
        </Button>

        <Button
          variant="ghost"
          className="w-full text-gray-400 hover:text-white"
          onClick={() => router.push("/")}
        >
          Continue without an account
        </Button>

        {message && (
          <p className="text-sm text-yellow-400 text-center">{message}</p>
        )}
      </div>
    </div>
  );
}
