// src/components/UrlCleanup.tsx

'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function UrlCleanup() {
  useEffect(() => {
    supabase.auth.getSession().then(() => {
      if (window.location.hash) {
        window.history.replaceState({}, document.title, '/');
      }
    });
  }, []);

  return null;
}

