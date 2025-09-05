"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <h1 className="text-2xl font-bold text-gray-900">ClaimAI</h1>
          {isLoaded && (
            <div>
              {isSignedIn ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/sign-up">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Fact Checking
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Verify claims instantly with our advanced AI-powered fact-checking platform. 
            Get comprehensive source analysis and evidence-based results.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSignedIn ? (
              <Button asChild size="lg" className="gap-2">
                <Link href="/fact-check">
                  Start Fact Checking <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-2">
                <Link href="/sign-up">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link href="/#features">Learn More</Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose ClaimAI?
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Instant Verification</h4>
              <p className="text-gray-600">Get real-time fact-checking results in seconds</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Analysis</h4>
              <p className="text-gray-600">Advanced AI algorithms for accurate verification</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Source Verification</h4>
              <p className="text-gray-600">Comprehensive source analysis and credibility scoring</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
