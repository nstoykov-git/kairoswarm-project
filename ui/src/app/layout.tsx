// app/layout.tsx (✅ server-only)

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { UserProvider } from "@/context/UserContext";
import ToasterWrapper from "./toaster-wrapper";

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
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          <ToasterWrapper />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}

