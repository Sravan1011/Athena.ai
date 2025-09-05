import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import ClientBody from './ClientBody';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "ClaimAI - AI-Powered Fact Checking",
  description: "Verify claims instantly with our advanced AI-powered fact-checking platform. Get comprehensive source analysis and evidence-based results.",
  keywords: "AI, fact checking, verification, misinformation, truth, claims",
  authors: [{ name: "ClaimAI Team" }],
  icons: {
    icon: "/clean-logo.svg",
    shortcut: "/clean-logo.svg",
    apple: "/clean-logo.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} antialiased`}>
        <ClientBody className="font-inter">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ClientBody>
      </html>
    </ClerkProvider>
  );
}
