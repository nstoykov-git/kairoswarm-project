// src/components/TopBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

export default function TopBar() {
  const router = useRouter();
  const { user, loading, signOut } = useUser();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-black border-b border-gray-800">
      <div className="text-white font-bold text-lg">Kairoswarm</div>
      {!loading && (
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-white text-sm">{user.display_name || user.email}</span>
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
