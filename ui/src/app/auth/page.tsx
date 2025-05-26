"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");

  const handleAuth = async () => {
    setMessage("");
    const fn = mode === "sign-in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { data, error } = await fn({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (data?.user?.id) {
      localStorage.setItem("kairoswarm_user_id", data.user.id);
      setMessage("Success! You can now join the swarm.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Welcome to Kairoswarm</h1>
      <p className="text-gray-400 text-sm">Sign in to persist your swarms and access personalized agents</p>

      <div className="space-y-2">
        <Button variant="secondary" className="w-48">
          Sign In
        </Button>
        <Button variant="secondary" className="w-48">
          Sign Up
        </Button>
        <Button variant="ghost" className="w-48 text-gray-400 hover:text-white">
          Continue without an account
        </Button>
      </div>
    </div>
  );
}

