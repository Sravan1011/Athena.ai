"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Shield, Search, Brain, Lightbulb, Check, Eye, BookOpen, Scale, Zap, Play, Users, Clock, Target } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { TypeAnimation } from 'react-type-animation';
import { RSSFeedSection } from "@/components/RSSFeedSection";


export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  
  // Parallax transforms - reduced for better performance
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  // Section component with intersection observer
  const Section = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <main ref={containerRef} className="min-h-screen aged-paper relative overflow-hidden">
      {/* Vintage paper overlay for entire page */}
      <div className="fixed inset-0 vintage-paper-overlay pointer-events-none z-0"></div>
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 vintage-texture opacity-15"></div>
        <div className="absolute inset-0 sherlock-background opacity-20"></div>
        <div className="absolute inset-0 magnifying-glass-pattern opacity-10"></div>
        <div className="absolute inset-0 detective-pattern opacity-8"></div>
        <div className="absolute inset-0 pipe-pattern opacity-5"></div>
        <div className="absolute inset-0 vintage-book-pattern opacity-12"></div>
        <div 
          className="absolute inset-0 opacity-20"
              style={{
            background: `radial-gradient(1200px circle at 50% 50%, rgba(139, 87, 42, 0.02), transparent 70%)`
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-50 vintage-paper-nav fixed top-0 w-full"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-3 group">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="w-10 h-10 sherlock-gradient rounded-lg flex items-center justify-center shadow-lg border-2 border-[#654321]"
              >
                <Eye className="w-6 h-6 text-[#f8f5f0]" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#654321] to-[#8b572a] bg-clip-text text-transparent font-serif">
                Athena.ai
              </span>
              </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-[#654321] hover:text-[#8b572a] transition-colors font-serif font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="text-[#654321] hover:text-[#8b572a] transition-colors font-serif font-medium">
                How it Works
                    </Link>
              <Link href="#testimonials" className="text-[#654321] hover:text-[#8b572a] transition-colors font-serif font-medium">
                Testimonials
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {isLoaded && (
                <>
                  {isSignedIn ? (
                    <div className="flex items-center space-x-3">
                      <Button asChild variant="outline" size="sm" className="vintage-paper-card border-[#654321] text-[#654321] hover:bg-[#f4f1e8] font-serif">
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  ) : (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button asChild className="vintage-paper-button text-[#f8f5f0] shadow-lg font-serif">
                        <Link href="/sign-up">Begin Investigation</Link>
                    </Button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 pt-20 pb-32 vintage-paper-section"
      >
        <div className="max-w-6xl mx-auto px-6 better-alignment">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-flex items-center space-x-2 bg-[#f4f1e8] text-[#8b572a] px-4 py-2 rounded-full text-sm font-medium border border-[#d4af8c] sketch-texture">
              <Eye className="w-4 h-4" />
              <span>Uncover truth with detective precision</span>
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-7xl md:text-8xl font-bold mb-8 leading-tight better-alignment"
          >
            <div className="bg-gradient-to-r from-[#654321] via-[#8b572a] to-[#a06535] bg-clip-text text-transparent font-medieval-decorative text-shadow-vintage">
              <TypeAnimation
                sequence={[
                  'Investigate',
                  2000,
                  'Analyze',
                  2000,
                  'Verify',
                  2000,
                  'Discover',
                  2000,
                  'Investigate',
                  2000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </div>
            <br />
            <span className="bg-gradient-to-r from-[#8b572a] via-[#a06535] to-[#d4af8c] bg-clip-text text-transparent font-medieval-decorative text-shadow-vintage">
              with AI
            </span>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl text-[#654321] max-w-3xl mx-auto mb-12 leading-relaxed font-serif better-alignment text-shadow-vintage"
          >
            Like Sherlock Holmes with a digital magnifying glass. Uncover truth, 
            debunk misinformation, and solve the mysteries of our information age.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
              {isSignedIn ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="vintage-paper-button text-[#654321] shadow-xl text-lg px-8 py-4 font-medieval">
                  <Link href="/fact-check">
                    <Search className="mr-2 h-5 w-5" />
                    Start Investigating
                  </Link>
                </Button>
              </motion.div>
              ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild size="lg" className="vintage-paper-button text-[#654321] shadow-xl text-lg px-8 py-4 font-medieval">
                  <Link href="/sign-up">
                    Begin Investigation
                  </Link>
                </Button>
              </motion.div>
              )}
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-6 py-3 text-[#654321] hover:text-[#8b572a] transition-colors font-medieval"
            >
              <div className="w-10 h-10 vintage-paper-card rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-4 h-4 ml-0.5 text-[#654321]" />
                  </div>
              <span>Watch the demo</span>
            </motion.button>
          </motion.div>

          {/* Interactive Demo Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="relative max-w-4xl mx-auto better-alignment"
          >
            <div className="vintage-paper-card rounded-3xl shadow-2xl p-8">
              <div className="flex items-center space-x-2 mb-6">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-[#8b572a] rounded-full border border-[#654321]"></div>
                  <div className="w-3 h-3 bg-[#a06535] rounded-full border border-[#654321]"></div>
                  <div className="w-3 h-3 bg-[#d4af8c] rounded-full border border-[#654321]"></div>
                </div>
                <div className="flex-1 bg-[#f8f5f0] rounded-lg px-4 py-2 border border-[#d4af8c]">
                  <span className="text-sm text-[#654321] font-medieval">truthdetective.ai/investigate</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#8b572a] to-[#a06535] rounded-full flex items-center justify-center border-2 border-[#654321]">
                    <span className="text-[#f8f5f0] text-sm font-bold font-medieval">U</span>
                  </div>
                  <div className="flex-1 bg-[#f8f5f0] rounded-2xl p-4 border border-[#d4af8c]">
                    <p className="text-[#654321] font-medieval">&ldquo;The Earth is flat and NASA is hiding the truth&rdquo;</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#8b572a] to-[#a06535] rounded-full flex items-center justify-center border-2 border-[#654321]">
                    <Eye className="w-4 h-4 text-[#f8f5f0]" />
                      </div>
                  <div className="flex-1 bg-gradient-to-r from-[#f4f1e8] to-[#f0ede0] border-l-4 border-[#8b572a] rounded-2xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-[#8b572a] rounded-full"></div>
                      <span className="font-semibold text-[#654321] font-medieval">Investigation Complete - False</span>
                      <span className="text-sm text-[#8b572a] font-medieval">Confidence: 98%</span>
                    </div>
                    <p className="text-[#654321] font-medieval">Elementary, my dear Watson! This claim contradicts overwhelming scientific evidence. The Earth&rsquo;s spherical shape has been proven through multiple methods including satellite imagery, physics experiments, and astronomical observations.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section - "Athena.ai is for..." */}
      <Section className="py-24 relative z-10 vintage-paper-section" delay={0.2}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Investigation Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-5xl font-bold mb-6 font-serif text-shadow-vintage better-alignment"
              >
                Athena.ai is for{" "}
                <span className="bg-gradient-to-r from-[#8b572a] to-[#a06535] bg-clip-text text-transparent">
                  Investigation
                </span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-[#654321] mb-8 font-serif"
              >
                A digital detective in every search query
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <Search className="w-4 h-4 text-[#8b572a]" />
                  </div>
                  <span className="text-[#654321] font-serif">Cross-reference claims with 200+ trusted sources</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <Brain className="w-4 h-4 text-[#8b572a]" />
                  </div>
                  <span className="text-[#654321] font-serif">AI-powered evidence analysis and reasoning</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <Shield className="w-4 h-4 text-[#8b572a]" />
              </div>
                  <span className="text-[#654321] font-serif">Real-time misinformation detection</span>
            </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="vintage-paper-card rounded-3xl p-8 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#654321] font-medieval">🔍 Investigation Result</h3>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#8b572a]" />
                    <span className="text-sm text-[#8b572a] font-medieval">2.3s</span>
                  </div>
                </div>
                
                  <div className="space-y-4">
                  <div className="p-4 vintage-verified-badge border-l-4 border-[#4a7c59] rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="w-4 h-4 text-[#e8f5e8]" />
                      <span className="font-medium text-[#e8f5e8] font-medieval">✓ Case Verified True</span>
                    </div>
                    <p className="text-sm text-[#e8f5e8] font-medieval">Climate change is supported by overwhelming scientific evidence</p>
                      </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-[#654321] font-medieval">Evidence Sources:</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="vintage-source-tag px-2 py-1 rounded-lg text-xs font-medieval">NASA</span>
                      <span className="vintage-source-tag px-2 py-1 rounded-lg text-xs font-medieval">IPCC</span>
                      <span className="vintage-source-tag px-2 py-1 rounded-lg text-xs font-medieval">Nature</span>
                      <span className="vintage-source-tag px-2 py-1 rounded-lg text-xs font-medieval">+15 more</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Learning Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="vintage-paper-card rounded-3xl p-8 shadow-2xl lg:order-1"
            >
              <div className="space-y-6">
                <h3 className="font-semibold text-[#654321] flex items-center space-x-2 font-medieval">
                  <BookOpen className="w-5 h-5 text-[#8b572a]" />
                  <span>Educational Insights</span>
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 vintage-paper-card rounded-lg">
                    <h4 className="font-medium text-[#654321] mb-2 font-medieval">Why This Matters</h4>
                    <p className="text-sm text-[#8b572a] font-medieval">Understanding the difference between correlation and causation is crucial for evaluating scientific claims.</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-[#f4f1e8] to-[#f0ede0] rounded-lg border-l-4 border-[#8b572a]">
                    <h4 className="font-medium text-[#654321] mb-2 font-medieval">🔍 Detective Tip</h4>
                    <p className="text-sm text-[#8b572a] font-medieval">Always look for peer-reviewed sources and check if studies have been replicated by independent researchers.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="lg:order-2">
              <motion.h2 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-5xl font-bold mb-6 font-serif"
              >
                Athena.ai is for{" "}
                <span className="bg-gradient-to-r from-[#8b572a] to-[#a06535] bg-clip-text text-transparent">
                  Learning
                </span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-[#654321] mb-8 font-serif"
              >
                A tutor that teaches critical thinking
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <Lightbulb className="w-4 h-4 text-[#8b572a]" />
                  </div>
                  <span className="text-[#654321] font-serif">Learn to spot logical fallacies and bias</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <BookOpen className="w-4 h-4 text-[#8b572a]" />
                  </div>
                  <span className="text-[#654321] font-serif">Understand media literacy and source evaluation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#f4f1e8] rounded-lg flex items-center justify-center border border-[#d4af8c]">
                    <Target className="w-4 h-4 text-[#8b572a]" />
                  </div>
                  <span className="text-[#654321] font-serif">Practice with real-world examples</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Justice Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-5xl font-bold mb-6"
              >
                Athena.ai is for{" "}
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Justice
                </span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-slate-600 mb-8"
              >
                Fighting misinformation for a better world
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Protect democracy with informed citizens</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Build trust through transparency</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-slate-700">Combat harmful misinformation in real-time</span>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="vintage-paper-card rounded-3xl p-8 shadow-2xl"
            >
              <div className="space-y-6">
                <h3 className="font-semibold text-[#654321] font-medieval">📊 Investigation Dashboard</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-[#2d5016] to-[#4a7c59] rounded-lg border-2 border-[#4a7c59]">
                    <div className="text-lg font-bold text-[#e8f5e8] font-medieval">Not Applicable</div>
                    <div className="text-sm text-[#e8f5e8] font-medieval">Cases Solved</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-[#8b572a] to-[#a06535] rounded-lg border-2 border-[#654321]">
                    <div className="text-lg font-bold text-[#f8f5f0] font-medieval">Not Applicable</div>
                    <div className="text-sm text-[#f8f5f0] font-medieval">Mysteries Solved</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-[#4a5568] to-[#6b7280] rounded-lg border-2 border-[#6b7280]">
                    <div className="text-lg font-bold text-[#f7fafc] font-medieval">Not Applicable</div>
                    <div className="text-sm text-[#f7fafc] font-medieval">Deduction Rate</div>
                      </div>
                  <div className="text-center p-4 bg-gradient-to-br from-[#654321] to-[#8b572a] rounded-lg border-2 border-[#654321]">
                    <div className="text-lg font-bold text-[#f8f5f0] font-medieval">Not Applicable</div>
                    <div className="text-sm text-[#f8f5f0] font-medieval">Vigilance</div>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* RSS Feed Section */}
      <RSSFeedSection />

      {/* Testimonials Section */}
      <Section className="py-24 relative z-10" delay={0.4}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6 font-serif text-shadow-vintage">
                Athena.ai is for{" "}
              <span className="bg-gradient-to-r from-[#8b572a] to-[#a06535] bg-clip-text text-transparent">
                Fellow Detectives
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Inspector Sarah Chen",
                role: "Investigative Journalist",
                content: "Athena.ai helps me uncover the truth behind breaking news stories in seconds. It's like having Watson's analytical mind at my disposal.",
                avatar: "🔍"
              },
              {
                name: "Professor Marcus Johnson",
                role: "Academy Instructor",
                content: "My pupils love using Athena.ai to investigate claims they encounter. It's training them in the art of deduction and critical analysis.",
                avatar: "🎓"
              },
              {
                name: "Dr. Elena Rodriguez",
                role: "Research Detective",
                content: "The AI's ability to scrutinize scientific claims with precision is remarkable. It's democratizing the detective work of fact-checking.",
                avatar: "🧪"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="vintage-paper-card rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#8b572a] to-[#a06535] rounded-full flex items-center justify-center border-2 border-[#654321]">
                    <span className="text-[#f8f5f0] text-lg">{testimonial.avatar}</span>
                  </div>
              <div>
                    <h4 className="font-semibold text-[#654321] font-serif">{testimonial.name}</h4>
                    <p className="text-sm text-[#8b572a] font-serif italic">{testimonial.role}</p>
              </div>
            </div>
                <p className="text-[#654321] leading-relaxed font-serif">&ldquo;{testimonial.content}&rdquo;</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section className="py-24 relative z-10" delay={0.6}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-bold mb-6 font-serif text-shadow-vintage"
          >
            Begin your{" "}
            <span className="bg-gradient-to-r from-[#8b572a] to-[#a06535] bg-clip-text text-transparent">
              investigation
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-[#654321] mb-12 font-serif"
          >
            Join thousands of fellow detectives using AI to uncover truth and solve mysteries
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button asChild size="lg" className="vintage-paper-button text-[#654321] shadow-xl text-lg px-12 py-6 font-medieval">
              <Link href={isSignedIn ? "/fact-check" : "/sign-up"}>
                {isSignedIn ? "Start Investigating" : "Get Early Access"}
            </Link>
          </Button>
          </motion.div>
        </div>
      </Section>

      {/* Footer with Enhanced Vintage Gradient */}
      <footer className="relative z-10 mt-24">
        {/* Multi-layered Detective-style gradient background */}
        <div className="h-96 relative overflow-hidden">
          {/* Base gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b572a] via-[#a06535] to-[#f4f1e8]"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#654321] via-transparent to-[#8b572a] opacity-70"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#654321] via-[#8b572a] to-transparent opacity-60"></div>
          
          {/* Vintage pattern overlays */}
          <div className="absolute inset-0 detective-pattern opacity-20"></div>
          <div className="absolute inset-0 magnifying-glass-pattern opacity-15"></div>
          <div className="absolute inset-0 sketch-texture"></div>
          
          {/* Animated gradient orbs */}
          <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-r from-[#8b572a] to-[#a06535] rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-60 h-60 bg-gradient-to-r from-[#654321] to-[#8b572a] rounded-full blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-[#a06535] to-[#d4af8c] rounded-full blur-3xl opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-[#f8f5f0] drop-shadow-lg">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-6"
              >
                <motion.h3 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl font-bold font-serif drop-shadow-2xl"
                >
                  Athena.ai
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl opacity-90 max-w-lg mx-auto font-serif drop-shadow-lg"
                >
                  Bringing clarity to the age of information
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex justify-center space-x-8 text-sm font-serif"
                >
                  <Link href="#" className="hover:text-[#f4f1e8] transition-colors hover:scale-105 transform duration-200">Privacy</Link>
                  <Link href="#" className="hover:text-[#f4f1e8] transition-colors hover:scale-105 transform duration-200">Terms</Link>
                  <Link href="#" className="hover:text-[#f4f1e8] transition-colors hover:scale-105 transform duration-200">About</Link>
                  <Link href="#" className="hover:text-[#f4f1e8] transition-colors hover:scale-105 transform duration-200">Contact</Link>
                </motion.div>
                <motion.p 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.75 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="text-sm font-serif"
                >
                  © 2025 Athena.ai. Powered by AI, guided by truth.
                </motion.p>
              </motion.div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}