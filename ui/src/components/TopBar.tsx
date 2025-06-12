'use client';

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import { useUser } from "@/lib/useUser";
import { supabase } from "@/lib/supabase";

export default function TopBar() {
  const router = useRouter();
  const { user, loading } = useUser();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="w-full px-4 py-2 flex justify-end items-center bg-gray-950 text-white border-b border-gray-800">
      {!loading && user ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-300">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-1" />
            Sign Out
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => router.push("/auth")}>
          <LogIn className="w-4 h-4 mr-1" />
          Sign In
        </Button>
      )}
    </div>
  );
}
