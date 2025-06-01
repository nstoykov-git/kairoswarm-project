"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setMessage("");

    const endpoint = mode === "sign-in" ? "/auth/signin" : "/auth/signup";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_MODAL_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, display_name: displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.detail || "Something went wrong");
        return;
      }

      // ✅ For sign-in: manually set the Supabase session
      if (mode === "sign-in" && data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          console.error("Supabase session error:", sessionError.message);
          setMessage("Failed to persist session.");
          return;
        }
      }

      localStorage.setItem("kairoswarm_user_id", data.user_id);
      localStorage.setItem("kairoswarm_user_email", data.email);

      setMessage("✅ Success! Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err) {
      console.error("Auth error:", err);
      setMessage("Network error. Please try again.");
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

        {/* 🧠 Google OAuth button here */}
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
  options: { redirectTo }
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
          onClick={() => (window.location.href = "/")}
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

