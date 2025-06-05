"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  const router = useRouter();
  const { user } = useUser();

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
      }

      setMessage("✅ Success! Redirecting...");
      setTimeout(() => {
        router.refresh(); // forces context (UserProvider) to re-evaluate
        router.push("/"); // also navigate just in case
      }, 800);
    } catch (err) {
      console.error("Auth error:", err);
      setMessage("❌ Network error. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    const redirectTo = typeof window !== "undefined" ? window.location.origin : "https://kairoswarm.nextminds.network";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setMessage("Google sign-in failed: " + error.message);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error.message);
      setMessage("❌ Sign-out failed");
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Welcome to Kairoswarm</h1>
      <p className="text-gray-400 text-sm text-center">
        Sign in to persist your swarms and access personalized agents
      </p>

      <div className="space-y-3 w-80">
        {user ? (
          <>
            <p className="text-sm text-center text-gray-300">
              ✅ Signed in as <span className="font-medium">{user.email}</span>
            </p>
            <Button variant="secondary" className="w-full" onClick={handleSignOut}>
              🚪 Sign Out
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
              onClick={() => router.push("/")}
            >
              Go to Dashboard
            </Button>
          </>
        ) : (
          <>
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
                onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
              >
                Switch to {mode === "sign-in" ? "Sign Up" : "Sign In"}
              </Button>
            </div>

            <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn}>
              Sign in with Google
            </Button>

            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-white"
              onClick={() => router.push("/")}
            >
              Continue without an account
            </Button>
          </>
        )}

        {message && <p className="text-sm text-yellow-400 text-center">{message}</p>}
      </div>
    </div>
  );
}
