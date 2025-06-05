"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ReactNode, useState } from "react";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

// Font setup
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Kairoswarm",
  description: "Swarms of humans and AI collaborating in real time",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionContextProvider supabaseClient={supabase}>
          <Toaster position="bottom-right" />
          {children}
        </SessionContextProvider>
      </body>
    </html>
  );
}
