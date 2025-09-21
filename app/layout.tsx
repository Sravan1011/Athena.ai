import type { Metadata } from "next";
import { Inter, Cinzel, Cinzel_Decorative, Uncial_Antiqua } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import ClientBody from './ClientBody';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

const cinzel = Cinzel({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-cinzel',
});

const cinzelDecorative = Cinzel_Decorative({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-cinzel-decorative',
  weight: ['400', '700'],
});

const uncialAntiqua = Uncial_Antiqua({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-uncial',
  weight: '400',
});

export const metadata: Metadata = {
  title: "Athena.ai - AI-Powered Fact Checking",
  description: "Verify claims instantly with our advanced AI-powered fact-checking platform. Get comprehensive source analysis and evidence-based results.",
  keywords: "AI, fact checking, verification, misinformation, truth, claims",
  authors: [{ name: "Athena.ai Team" }],
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
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${uncialAntiqua.variable} antialiased`}>
        <ClientBody className="font-inter">
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ClientBody>
      </html>
    </ClerkProvider>
  );
}
