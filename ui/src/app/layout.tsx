// app/layout.tsx (✅ App Router, global cleanup)

'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode, useEffect } from "react";
import { UserProvider } from "@/context/UserContext";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

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

  useEffect(() => {
    // Supabase handles the session. This cleans the URL fragment.
    supabase.auth.getSession().then(() => {
      if (window.location.hash) {
        window.history.replaceState({}, document.title, "/");
      }
    });
  }, []);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          {children}
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
