import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/store/provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuilderPro — Construction Project Management",
  description:
    "Premium SaaS platform for construction project management. Manage projects, tasks, finances, teams, and clients — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </StoreProvider>
      </body>
    </html>
  );
}
