import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import ClientBody from './ClientBody';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mumbai Hack",
  description: "AI-powered content verification platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <ClientBody className={inter.className}>
          {children}
        </ClientBody>
      </html>
    </ClerkProvider>
  );
}
