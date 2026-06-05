import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AuthGuard } from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jarvis — Softdroom Holdings",
  description: "Growth & operations for Softdroom Holdings, Reelin AI, Swiftdroom, and portfolio subsidiaries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-white min-h-screen`}
      >
        <Providers>
          <AuthGuard>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-hidden pt-12 md:pt-0">{children}</main>
            </div>
          </AuthGuard>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
