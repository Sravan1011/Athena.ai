"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Shield, Search, Zap, Eye, Target, Users, Sparkles, Globe, Brain, Lightbulb, TrendingUp, Star, Check, X, BarChart3, Bot, Newspaper, AlertTriangle, Menu, ChevronDown, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from '@/components/theme-provider';

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const { theme } = useTheme();
  const [currentStat, setCurrentStat] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoText, setDemoText] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  
  const stats = [
    { number: "99.7%", label: "Accuracy Rate" },
    { number: "50M+", label: "Claims Verified" },
    { number: "15sec", label: "Average Response Time" },
    { number: "200+", label: "Trusted Sources" }
  ];
  
  const typewriterTexts = [
    "Fight misinformation with AI-powered fact-checking",
    "Verify news articles in seconds",
    "Get evidence-based truth analysis",
    "Combat fake news with reliable sources"
  ];

  // Dynamic stats cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Mouse tracking for interactive elements
  useEffect(() => {
    setIsClient(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Demo analysis simulation
  useEffect(() => {
    if (isDemo) {
      const steps = [
        "Analyzing text content...",
        "Cross-referencing with trusted sources...",
        "Evaluating credibility score...",
        "Analysis complete!"
      ];
      
      let stepIndex = 0;
      const demoTimer = setInterval(() => {
        if (stepIndex < steps.length) {
          setDemoText(steps[stepIndex]);
          setAnalysisStep(stepIndex);
          stepIndex++;
        } else {
          setIsDemo(false);
          setAnalysisStep(0);
          clearInterval(demoTimer);
        }
      }, 1500);
      
      return () => clearInterval(demoTimer);
    }
  }, [isDemo]);

  // Typewriter effect
  useEffect(() => {
    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    
    const typeTimer = setInterval(() => {
      const currentFullText = typewriterTexts[currentTextIndex];
      
      if (!isDeleting) {
        setTypedText(currentFullText.substring(0, currentCharIndex + 1));
        currentCharIndex++;
        
        if (currentCharIndex === currentFullText.length) {
          setTimeout(() => { isDeleting = true; }, 2000);
        }
      } else {
        setTypedText(currentFullText.substring(0, currentCharIndex - 1));
        currentCharIndex--;
        
        if (currentCharIndex === 0) {
          isDeleting = false;
          currentTextIndex = (currentTextIndex + 1) % typewriterTexts.length;
        }
      }
    }, isDeleting ? 50 : 100);
    
    return () => clearInterval(typeTimer);
  }, []);

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Enhanced Animated Background */}
      {isClient && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Interactive Floating Particles */}
          {[...Array(12)].map((_, i) => {
          const delay = i * 0.5;
          // Use consistent sizes based on index to avoid hydration mismatch
          const sizes = [8, 12, 6, 10, 14, 7, 9, 11, 5, 13, 8, 10];
          const size = sizes[i];
          const colors = ['bg-blue-200', 'bg-green-200', 'bg-purple-200', 'bg-yellow-200', 'bg-pink-200', 'bg-indigo-200'];
          const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
          const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;
          
          // Use consistent positioning based on index to avoid hydration mismatch
          const positions = [
            { left: '10%', top: '20%' }, { left: '80%', top: '15%' }, { left: '60%', top: '60%' },
            { left: '20%', top: '70%' }, { left: '90%', top: '50%' }, { left: '40%', top: '30%' },
            { left: '70%', top: '80%' }, { left: '15%', top: '45%' }, { left: '85%', top: '75%' },
            { left: '50%', top: '25%' }, { left: '30%', top: '85%' }, { left: '75%', top: '35%' }
          ];
          
          const durations = [3.5, 4.2, 3.8, 4.5, 3.2, 4.0, 3.7, 4.3, 3.9, 4.1, 3.4, 3.6];
          
          return (
            <div
              key={i}
              className={`absolute ${colors[i % colors.length]} rounded-full animate-float opacity-60`}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: positions[i].left,
                top: positions[i].top,
                animationDelay: `${delay}s`,
                animationDuration: `${durations[i]}s`,
                transform: `translate(${(mousePosition.x - centerX) * 0.01}px, ${(mousePosition.y - centerY) * 0.01}px)`
              }}
            />
          );
        })}

        {/* Dynamic SVG Illustrations */}
        <svg className="absolute top-20 left-10 w-24 h-24 text-blue-300 opacity-30" viewBox="0 0 100 100">
          <path d="M20,50 Q50,20 80,50 Q50,80 20,50" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="8,4">
            <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="20s" repeatCount="indefinite"/>
          </path>
          <circle cx="50" cy="50" r="3" fill="currentColor">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"/>
          </circle>
        </svg>

        <svg className="absolute top-1/3 right-16 w-32 h-32 text-green-300 opacity-25" viewBox="0 0 100 100">
          <polygon points="50,5 20,95 80,95" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="6,3">
            <animate attributeName="stroke-dashoffset" values="0;9" dur="4s" repeatCount="indefinite"/>
          </polygon>
          <path d="M35,70 Q50,60 65,70" stroke="currentColor" strokeWidth="1.5" fill="none">
            <animate attributeName="d" values="M35,70 Q50,60 65,70;M35,70 Q50,50 65,70;M35,70 Q50,60 65,70" dur="3s" repeatCount="indefinite"/>
          </path>
        </svg>

        <svg className="absolute bottom-1/4 left-1/4 w-28 h-28 text-purple-300 opacity-35" viewBox="0 0 100 100">
          <rect x="25" y="25" width="50" height="50" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="5,5" rx="8">
            <animateTransform attributeName="transform" type="rotate" values="0 50 50;180 50 50;360 50 50" dur="15s" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" values="0;10" dur="2s" repeatCount="indefinite"/>
          </rect>
          <circle cx="50" cy="50" r="8" stroke="currentColor" strokeWidth="1" fill="none">
            <animate attributeName="r" values="8;12;8" dur="2.5s" repeatCount="indefinite"/>
          </circle>
        </svg>

        <svg className="absolute bottom-20 right-20 w-36 h-36 text-yellow-300 opacity-25" viewBox="0 0 100 100">
          <path d="M50,10 L90,90 L10,90 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="8,4">
            <animate attributeName="stroke-dashoffset" values="0;12" dur="3.5s" repeatCount="indefinite"/>
          </path>
          <path d="M30,75 Q50,60 70,75" stroke="currentColor" strokeWidth="1.5" fill="none">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
          </path>
        </svg>

        {/* Floating Icon Doodles */}
        <div className="absolute top-1/4 left-1/6 animate-float" style={{animationDelay: '1s'}}>
          <Brain className="w-8 h-8 text-blue-400 opacity-40" />
        </div>
        <div className="absolute top-2/3 right-1/5 animate-float" style={{animationDelay: '2s'}}>
          <Lightbulb className="w-6 h-6 text-yellow-400 opacity-40" />
        </div>
        <div className="absolute top-1/2 left-1/12 animate-float" style={{animationDelay: '0.5s'}}>
          <Star className="w-5 h-5 text-purple-400 opacity-40" />
        </div>
        <div className="absolute bottom-1/3 right-1/6 animate-float" style={{animationDelay: '1.5s'}}>
          <TrendingUp className="w-7 h-7 text-green-400 opacity-40" />
        </div>
      </div>
      )}

      {/* Gemini-Style Navigation */}
      <nav className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section - Left */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg logo-container group-hover:scale-105 transition-all duration-300">
                  <Image 
                    src="/clean-logo.svg" 
                    alt="ClaimAI Logo" 
                    width={24} 
                    height={24}
                    className="w-6 h-6 object-contain logo-image"
                    priority
                  />
                </div>
                <span className="text-xl font-medium text-gray-900 tracking-tight">ClaimAI</span>
              </Link>
            </div>
            
            {/* Center Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#pricing" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium">
                Free for Students
              </Link>
              
              {/* Features Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                  className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium"
                >
                  <span>What ClaimAI Can Do</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${featuresDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {featuresDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <Link href="#features" className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors" onClick={() => setFeaturesDropdownOpen(false)}>
                      <Search className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900">Real-time Verification</div>
                        <div className="text-xs text-gray-500">Instant fact-checking results</div>
                      </div>
                    </Link>
                    <Link href="#features" className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors" onClick={() => setFeaturesDropdownOpen(false)}>
                      <Shield className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">Multi-Source Analysis</div>
                        <div className="text-xs text-gray-500">200+ credible sources</div>
                      </div>
                    </Link>
                    <Link href="#features" className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors" onClick={() => setFeaturesDropdownOpen(false)}>
                      <Brain className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-gray-900">AI Context Understanding</div>
                        <div className="text-xs text-gray-500">Advanced NLP analysis</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              <Link href="#pricing" className="text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium">
                Subscriptions
              </Link>
              
              {/* About Dropdown */}
              <div className="relative">
                <button className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900 transition-colors font-medium">
                  <span>About ClaimAI</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Side - CTA Button */}
            <div className="flex items-center">
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="flex items-center space-x-3">
                      <Button asChild variant="outline" size="sm" className="hidden md:flex">
                        <Link href="/fact-check">Dashboard</Link>
                      </Button>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  ) : (
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 text-sm font-medium">
                      <Link href="/sign-up">Try ClaimAI</Link>
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-2">
              <Link href="#pricing" className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
                Free for Students
              </Link>
              <Link href="#features" className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
                What ClaimAI Can Do
              </Link>
              <Link href="#pricing" className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
                Subscriptions
              </Link>
              <Link href="#about" className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
                About ClaimAI
              </Link>
              
              {isLoaded && !isSignedIn && (
                <div className="border-t border-gray-100 pt-4 px-4">
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/sign-up">Try ClaimAI</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Gemini-Style Hero Section */}
      <section className="pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Meet the everyday AI fact-checker</span>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-6xl lg:text-8xl font-normal text-gray-900 leading-tight mb-8 tracking-tight">
              Stop <span className="font-bold">fake news</span>
            </h1>
            
            {/* Subheading with Typewriter */}
            <div className="max-w-3xl mx-auto mb-12">
              <p className="text-xl lg:text-2xl text-gray-600 leading-relaxed min-h-[2.5rem]">
                {typedText}
                <span className="animate-pulse text-blue-600">|</span>
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              {isSignedIn ? (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-4 text-lg font-medium group shadow-lg">
                  <Link href="/fact-check">
                    <Search className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Start fact checking
                  </Link>
                </Button>
              ) : (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-4 text-lg font-medium group shadow-lg">
                  <Link href="/sign-up">
                    Try it now
                  </Link>
                </Button>
              )}
            </div>

            {/* Demo Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Real-time Analysis Card */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-500 group cursor-pointer" onClick={() => setIsDemo(true)}>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Search className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ask complex questions</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Want to verify a breaking news story or understand misinformation patterns? ClaimAI analyzes claims instantly.
                  </p>
                </div>
                
                {/* Interactive Demo */}
                {isDemo && (
                  <div className="bg-gray-50 rounded-2xl p-4 animate-fade-in-up">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <Bot className="w-4 h-4 animate-spin" />
                      <span>{demoText}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(analysisStep + 1) * 25}%` }}
                      />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center text-blue-600 text-sm font-medium mt-4">
                  <span>Try it now</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Multi-Source Verification */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-500 group">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Cross-reference sources</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Our AI checks claims against 200+ credible sources including Reuters, AP News, and academic journals.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {['Reuters', 'AP News', 'BBC'].map((source, index) => (
                    <div key={source} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-700">{source}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Context Understanding */}
              <div className="bg-white rounded-3xl p-8 border border-gray-200 hover:shadow-xl transition-all duration-500 group">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Write in less time</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Go from suspicious claim to verified fact faster. Use ClaimAI to analyze context and generate evidence-based reports.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs text-gray-500 mb-2">Analysis Result</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">Likely False</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Confidence: 94%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Trust Indicators - Gemini Style */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm text-gray-500 mb-8">Trusted by news organizations, researchers, and fact-checkers worldwide</p>
            <div className="flex justify-center items-center space-x-12 opacity-60">
              <span className="text-2xl font-medium text-gray-400">Reuters</span>
              <span className="text-2xl font-medium text-gray-400">BBC</span>
              <span className="text-2xl font-medium text-gray-400">FactCheck.org</span>
              <span className="text-2xl font-medium text-gray-400">Snopes</span>
              <span className="text-2xl font-medium text-gray-400">AP News</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gemini-Style Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Turn claims into insights */}
          <div className="mb-24">
            <div className="text-center mb-16">
              <h2 className="text-5xl lg:text-6xl font-normal text-gray-900 mb-8 tracking-tight">
                Turn claims into <span className="font-bold">insights</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Create comprehensive fact-checking reports with our latest analysis models. Simply describe the claim you want to verify and watch ClaimAI provide evidence-based insights.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-3xl p-8 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Real-time verification in seconds</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Want to understand if a breaking news story is accurate or analyze misinformation patterns? ClaimAI cross-references claims against trusted sources instantly.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">Cross-reference 200+ trusted sources</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">Advanced context understanding</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">Evidence-based credibility scoring</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <div className="text-xs text-gray-500 mb-4">Sample Analysis</div>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-sm font-medium text-gray-900 mb-2">Claim:</div>
                      <div className="text-sm text-gray-700">"New study shows coffee reduces heart disease risk by 50%"</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">Misleading</span>
                      </div>
                      <div className="text-xs text-red-700">Study shows 15% reduction, not 50%. Claim exaggerated.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Research Equivalent */}
          <div className="mb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Comprehensive source analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Analyze hundreds of sources and create detailed credibility reports in minutes.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {[
                    { source: "Reuters", credibility: 95, status: "verified" },
                    { source: "Associated Press", credibility: 92, status: "verified" },
                    { source: "Dubious News Site", credibility: 23, status: "questionable" }
                  ].map((item) => (
                    <div key={item.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${item.status === 'verified' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-900">{item.source}</span>
                      </div>
                      <span className="text-xs text-gray-600">{item.credibility}%</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-4xl font-normal text-gray-900 mb-6 tracking-tight">
                  Condense hours of research with <span className="font-bold">Deep Analysis</span>
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Sift through hundreds of sources, analyze credibility patterns, and create comprehensive fact-checking reports in minutes. It's like having a personalized research agent for every claim.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3">
                  Learn more
                </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Gemini-Style CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl lg:text-6xl font-normal text-gray-900 mb-8 tracking-tight">
            Ready to fight <span className="font-bold">misinformation?</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-2xl mx-auto">
            Join thousands of journalists, researchers, and truth-seekers using ClaimAI to verify information instantly.
          </p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-4 text-lg font-medium shadow-lg">
            <Link href={isSignedIn ? "/fact-check" : "/sign-up"}>
              Start fact-checking now
            </Link>
          </Button>
        </div>
      </section>

      {/* Gemini-Style Footer */}
      <footer className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center space-x-4 mb-8 md:mb-0">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 logo-container">
                <Image 
                  src="/clean-logo.svg" 
                  alt="ClaimAI Logo" 
                  width={40} 
                  height={40}
                  className="w-10 h-10 object-contain logo-image"
                />
              </div>
              <span className="text-xl font-semibold text-gray-900">ClaimAI</span>
            </div>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8">
              <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                About
              </Link>
              <Link href="#" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              © 2024 ClaimAI. Empowering truth in the age of misinformation.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
