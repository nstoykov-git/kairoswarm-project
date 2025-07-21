// src/components/TopBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { useSearchParams } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function TopBar() {
  const router = useRouter();
  const { user, loading, signOut } = useUser();

  const searchParams = useSearchParams();
  const swarmId = searchParams.get("swarm_id");
  const [copied, setCopied] = useState(false);

  const handleCopySwarmId = async () => {
    if (swarmId) {
      await navigator.clipboard.writeText(swarmId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-black border-b border-gray-800">
      {swarmId && (
        <div className="flex items-center gap-2 text-sm bg-gray-800 px-2 py-1 rounded">
          <span className="text-lime-400 font-mono truncate max-w-[160px]">{swarmId}</span>
          <Button variant="ghost" size="icon" onClick={handleCopySwarmId}>
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}

      <div className="text-white font-bold text-lg">Kairoswarm</div>
      {typeof window !== "undefined" && window.location.hostname === "kairoswarm.com" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = "https://www.kairoswarm.com"}
        >
          ← Back to Carousel
        </Button>
      )}

      
      {!loading && (
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-white text-sm">{user.display_name || user.email}</span>
              <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                <User className="w-4 h-4 mr-1" /> Profile
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => router.push("/auth")}> 
              <LogIn className="w-4 h-4 mr-1" /> Sign In
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
