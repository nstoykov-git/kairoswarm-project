'use client';

import { useRouter } from 'next/navigation';
import { LogIn, LogOut, User, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';

export default function TopBar() {
  const { user, loading, signOut } = useUser();

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-black border-b border-gray-800">
      <div className="text-white font-bold text-2xl">Kairoswarm</div>

      {!loading && (
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-white text-sm">{user.display_name || user.email}</span>
              <Button variant="secondary" size="sm" onClick={() => (window.location.href = '/profile')}>
                <User className="w-4 h-4 mr-1" /> Profile
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
              <Button
                variant="secondary"
                size="sm"
                title="Return to the Kairoswarm experience selector"
                onClick={() => (window.location.href = 'https://www.kairoswarm.com')}
              >
                <Film className="w-4 h-4 mr-1" /> Carousel
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => (window.location.href = '/auth')}>
              <LogIn className="w-4 h-4 mr-1" /> Sign In
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
