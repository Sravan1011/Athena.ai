"use client"

import { useState } from "react"
import { useUser, SignOutButton } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Search,
  Loader2,
  ExternalLink,
  Sparkles,
  HomeIcon,
  FileText,
  BarChart3,
  Shield,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  TrendingUp,
  Eye,
  Clock,
  Brain,
} from "lucide-react"
import { cn, formatConfidence, getVerdictColor, getVerdictIcon, formatProcessingTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

// Define types for the enhanced API response
interface EnhancedSource {
  title: string
  url: string
  domain: string
  credibilityScore: number
  sourceType: "news" | "academic" | "government" | "fact-checker" | "blog" | "unknown"
  publishDate?: string
  relevanceScore: number
  excerpt: string
}


interface FactCheckResult {
  claim: {
    text: string;
    explanation?: string;
  };
  verdict: "True" | "Mostly True" | "Mixed" | "Mostly False" | "False" | "Unverified";
  explanation: string;
  confidence?: number;
  evidence?: {
    supportingEvidence: string[];
    contradictingEvidence: string[];
    neutralEvidence: string[];
    evidenceQuality: "high" | "medium" | "low";
  };
  reasoning?: {
    keyFactors: string[];
    methodology: string;
    limitations: string[];
    contextualNotes: string[];
    reasoningChain?: string[];
    confidenceFactors?: string;
  };
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    credibilityScore: number;
    sourceType: "news" | "academic" | "government" | "fact-checker" | "blog" | "unknown";
    publishDate?: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  relatedClaims?: string[];
  processingTimeMs?: number;
  contextualInfo?: string
}

const factCheckSchema = z.object({
  claim: z.string().min(1, "Claim is required"),
})

type FactCheckForm = z.infer<typeof factCheckSchema>

export default function FactCheckPage() {
  const { user, isSignedIn } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<FactCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: false,
    reasoning: false,
    sources: false,
    related: false
  })

  const safeUser = isSignedIn
    ? {
        firstName: user?.firstName || "",
        email: user?.emailAddresses?.[0]?.emailAddress || "",
      }
    : null

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FactCheckForm>({
    resolver: zodResolver(factCheckSchema),
  })

  const onSubmit = async (data: FactCheckForm) => {
    if (!isSignedIn) {
      setError("Please sign in to use the fact checker")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Try enhanced fact-check first (using only the answer field as claim)
      const enhancedResponse = await fetch("/api/enhanced-fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claim: data.claim }),
      })

      if (enhancedResponse.ok) {
        const enhancedData = await enhancedResponse.json()
        
        // Transform enhanced response to match existing interface
        setResult({
          verdict: enhancedData.verdict,
          explanation: enhancedData.explanation,
          confidence: enhancedData.confidence,
          claim: { 
            text: enhancedData.claim.text,
            explanation: enhancedData.claim.explanation
          },
          evidence: enhancedData.evidence,
          reasoning: enhancedData.reasoning,
          sources: enhancedData.sources || [],
          relatedClaims: enhancedData.relatedClaims || [],
          processingTimeMs: enhancedData.processingTimeMs || 0,
        })
        return
      }

      // Fallback to original fact-check API
      const response = await fetch("/api/fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fact check. Please try again.")
      }

      const resultData: FactCheckResult = await response.json()

      // Validate the response structure
      if (!resultData.verdict || !resultData.explanation || !resultData.claim?.text) {
        throw new Error("Invalid response format from the server")
      }

      setResult({
        ...resultData,
        sources: resultData.sources || [],
        processingTimeMs: resultData.processingTimeMs || 0,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      console.error("Fact check error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    reset()
    setResult(null)
    setError(null)
    setExpandedSections({
      evidence: false,
      reasoning: false,
      sources: false,
      related: false
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'government': return <Shield className="w-4 h-4 text-blue-600" />
      case 'academic': return <BookOpen className="w-4 h-4 text-purple-600" />
      case 'fact-checker': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'news': return <FileText className="w-4 h-4 text-orange-600" />
      default: return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }


  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-sm">
          <CardHeader className="text-center">
            <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <CardTitle className="text-xl font-semibold text-gray-900">
              Sign In Required
            </CardTitle>
            <CardDescription>Please sign in to access the fact-checking tool.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
            <Button asChild variant="outline">
              <Link href="/" className="flex items-center justify-center">
                <HomeIcon className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sign-in" className="justify-center">
                Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="glass border-b border-white/20 px-6 py-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">ClaimAI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-700 font-medium">{safeUser?.firstName || safeUser?.email}</span>
            </div>
            <SignOutButton>
              <Button variant="ghost" size="sm" className="hover:bg-white/20 text-slate-700 rounded-lg">
                Sign Out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <main className="flex-1 p-6">
          {!result && !isLoading && (
            <div className="max-w-4xl mx-auto">
              {/* Hero Section */}
              <div className="text-center mb-16 mt-20 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-slate-600 text-sm font-medium mb-8">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  AI-Powered Fact Checking
                </div>
                
                <h2 className="text-5xl font-bold gradient-text mb-6">
                  Fact Check Any Claim
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  Discover the truth with AI-powered analysis and comprehensive source verification
                </p>
              </div>

              {/* Input Area */}
              <Card className="glass hover-lift border-white/20 bg-white/80 backdrop-blur-md shadow-2xl">
                <CardContent className="p-10">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="relative">
                      <Textarea
                        {...register("claim")}
                        rows={6}
                        className="resize-none text-lg placeholder:text-slate-400 border-white/30 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 rounded-2xl transition-all duration-300 hover:bg-white/70 focus:bg-white/90"
                        placeholder="Enter your claim here to discover the truth..."
                      />
                      <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded-lg">
                        Press Enter + Ctrl to submit
                      </div>
                      {errors.claim && (
                        <p className="text-sm text-red-600 mt-3 animate-bounce-subtle">{errors.claim.message}</p>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg hover-lift hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Search className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span>Check Claim</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-scale-in">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="max-w-4xl mx-auto">
              <Card className="glass hover-lift border-white/20 bg-white/80 backdrop-blur-md shadow-2xl">
                <CardContent className="py-20 text-center">
                  <div className="mb-8">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-slate-700 font-semibold text-xl mb-2">Analyzing your claim...</p>
                    <p className="text-slate-500 text-lg">Searching sources for verification</p>
                    <div className="flex justify-center space-x-1 mt-6">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Enhanced Results */}
          {result && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
              {/* Main Results Card */}
              <Card className="glass hover-lift border-white/20 bg-white/90 backdrop-blur-md shadow-2xl">
                <CardHeader className="border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl font-bold gradient-text">Analysis Results</CardTitle>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center text-sm text-slate-600 bg-white/50 px-4 py-2 rounded-xl border border-white/30">
                        <Clock className="w-4 h-4 mr-2" />
                        {formatProcessingTime(result.processingTimeMs || 0)}
                      </div>
                      <div
                        className={cn(
                          "px-6 py-4 rounded-xl text-lg font-semibold flex items-center space-x-3 border shadow-lg transition-all duration-200",
                          getVerdictColor(result.verdict, "bg"),
                        )}
                      >
                        <div className="p-1.5 bg-white/20 rounded-lg">
                          {getVerdictIcon(result.verdict, "h-5 w-5", "dark")}
                        </div>
                        <span className="text-white text-lg font-medium">{result.verdict}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Analysis Summary - Simplified */}
                  <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-slate-600">Confidence: <span className="font-semibold text-slate-800">{result.confidence ? formatConfidence(result.confidence) : 'High'}</span></span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">Quality: <span className="font-semibold text-slate-800">{result.evidence?.evidenceQuality || 'High'}</span></span>
                      </div>
                      <div className="text-slate-500 text-xs">
                        AI-Powered Analysis
                      </div>
                    </div>
                  </div>

                  {/* Claim - Simplified */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 mb-3">Claim</h3>
                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/40">
                      <p className="text-lg text-slate-800 leading-relaxed mb-4">{result.claim.text}</p>
                      {result.claim.explanation && (
                        <div className="pt-4 border-t border-slate-200">
                          <p className="text-sm text-slate-600 leading-relaxed">{result.claim.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Main Explanation - Simplified */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-600 mb-3">Analysis</h3>
                    <div className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200">
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          {getVerdictIcon(result.verdict, "h-4 w-4", "light")}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-2">{result.verdict} - Here&apos;s why:</h4>
                          <p className="text-slate-800 leading-relaxed">{result.explanation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidence Breakdown - Simplified */}
              {result.evidence && (
                <Card className="glass hover-lift border-white/20 bg-white/90 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-white/20">
                    <button
                      onClick={() => toggleSection('evidence')}
                      className="w-full flex items-center justify-between text-left hover:bg-white/10 p-4 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="w-5 h-5 text-slate-600" />
                        <CardTitle className="text-lg font-semibold text-slate-800">Evidence</CardTitle>
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-xs font-medium",
                          result.evidence.evidenceQuality === 'high' ? 'bg-green-100 text-green-700' :
                          result.evidence.evidenceQuality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {result.evidence.evidenceQuality}
                        </span>
                      </div>
                      {expandedSections.evidence ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </button>
                  </CardHeader>
                  {expandedSections.evidence && (
                    <CardContent className="p-6">
                      {/* Evidence Summary - Simplified */}
                      <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-slate-600">{result.evidence.supportingEvidence.length} supporting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-slate-600">{result.evidence.contradictingEvidence.length} contradicting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Minus className="w-4 h-4 text-slate-600" />
                            <span className="text-sm text-slate-600">{result.evidence.neutralEvidence.length} contextual</span>
                          </div>
                        </div>
                      </div>

                      {/* Supporting Evidence - Simplified */}
                      {result.evidence.supportingEvidence.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Supporting Evidence ({result.evidence.supportingEvidence.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.evidence.supportingEvidence.map((evidence: string, i: number) => (
                              <div key={i} className="bg-green-50 p-3 rounded-lg border-l-2 border-green-400">
                                <p className="text-sm text-slate-700">{evidence}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Contradicting Evidence - Simplified */}
                      {result.evidence.contradictingEvidence.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span>Contradicting Evidence ({result.evidence.contradictingEvidence.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.evidence.contradictingEvidence.map((evidence: string, i: number) => (
                              <div key={i} className="bg-red-50 p-3 rounded-lg border-l-2 border-red-400">
                                <p className="text-sm text-slate-700">{evidence}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Neutral Evidence - Simplified */}
                      {result.evidence.neutralEvidence.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <Minus className="w-4 h-4 text-slate-600" />
                            <span>Contextual Information ({result.evidence.neutralEvidence.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.evidence.neutralEvidence.map((evidence: string, i: number) => (
                              <div key={i} className="bg-slate-50 p-3 rounded-lg border-l-2 border-slate-400">
                                <p className="text-sm text-slate-700">{evidence}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Enhanced Sources - Simplified */}
              {result.sources && result.sources.length > 0 && (
                <Card className="glass hover-lift border-white/20 bg-white/90 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-white/20">
                    <button
                      onClick={() => toggleSection('sources')}
                      className="w-full flex items-center justify-between text-left hover:bg-white/10 p-4 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <ExternalLink className="w-5 h-5 text-slate-600" />
                        <CardTitle className="text-lg font-semibold text-slate-800">Sources</CardTitle>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          {result.sources.length}
                        </span>
                      </div>
                      {expandedSections.sources ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </button>
                  </CardHeader>
                  {expandedSections.sources && (
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {result.sources?.slice(0, 5).map((source: EnhancedSource, i: number) => (
                          <div key={i} className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-lg p-4 hover:bg-white/80 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getSourceTypeIcon(source.sourceType)}
                                <span className="text-xs text-slate-500 uppercase">{source.sourceType}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-xs text-slate-500">{source.domain}</span>
                              </div>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                getCredibilityColor(source.credibilityScore)
                              )}>
                                {source.credibilityScore}%
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-slate-800 mb-2 text-sm leading-tight">{source.title}</h4>
                            <p className="text-slate-600 mb-3 text-sm leading-relaxed line-clamp-2">{source.excerpt}</p>
                            
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs font-medium"
                            >
                              <span>View Source</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Reasoning Breakdown - Simplified */}
              {result.reasoning && (
                <Card className="glass hover-lift border-white/20 bg-white/90 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-white/20">
                    <button
                      onClick={() => toggleSection('reasoning')}
                      className="w-full flex items-center justify-between text-left hover:bg-white/10 p-4 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Eye className="w-5 h-5 text-slate-600" />
                        <CardTitle className="text-lg font-semibold text-slate-800">Methodology</CardTitle>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          AI
                        </span>
                      </div>
                      {expandedSections.reasoning ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </button>
                  </CardHeader>
                  {expandedSections.reasoning && (
                    <CardContent className="p-6 space-y-4">
                      {/* Methodology - Simplified */}
                      <div className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Methodology</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">{result.reasoning.methodology}</p>
                      </div>
                      
                      {/* Reasoning Chain - Simplified */}
                      {result.reasoning.reasoningChain && result.reasoning.reasoningChain.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <Brain className="w-4 h-4 text-slate-600" />
                            <span>Reasoning Steps ({result.reasoning.reasoningChain.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.reasoning.reasoningChain.map((step: string, i: number) => (
                              <div key={i} className="bg-blue-50 p-3 rounded-lg border-l-2 border-blue-400">
                                <div className="flex items-start space-x-3">
                                  <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-sm text-slate-700">{step}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Factors - Simplified */}
                      {result.reasoning.keyFactors.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-slate-600" />
                            <span>Key Factors ({result.reasoning.keyFactors.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.reasoning?.keyFactors.map((factor: string, i: number) => (
                              <div key={i} className="bg-green-50 p-3 rounded-lg border-l-2 border-green-400">
                                <p className="text-sm text-slate-700">{factor}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Confidence Factors - Simplified */}
                      {result.reasoning.confidenceFactors && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-slate-600" />
                            <span>Confidence Analysis ({Math.round((result.confidence || 0) * 100)}%)</span>
                          </h4>
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-sm text-slate-600 leading-relaxed">{result.reasoning.confidenceFactors}</p>
                          </div>
                        </div>
                      )}

                      {/* Limitations - Simplified */}
                      {result.reasoning.limitations.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-slate-600" />
                            <span>Limitations ({result.reasoning.limitations.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {result.reasoning?.limitations.map((limitation: string, i: number) => (
                              <div key={i} className="bg-amber-50 p-3 rounded-lg border-l-2 border-amber-400">
                                <p className="text-sm text-slate-700">{limitation}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Related Claims - Simplified */}
              {result.relatedClaims && result.relatedClaims.length > 0 && (
                <Card className="glass hover-lift border-white/20 bg-white/90 backdrop-blur-md shadow-xl">
                  <CardHeader className="border-b border-white/20">
                    <button
                      onClick={() => toggleSection('related')}
                      className="w-full flex items-center justify-between text-left hover:bg-white/10 p-4 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Search className="w-5 h-5 text-slate-600" />
                        <CardTitle className="text-lg font-semibold text-slate-800">Related Claims</CardTitle>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                          {result.relatedClaims.length}
                        </span>
                      </div>
                      {expandedSections.related ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </button>
                  </CardHeader>
                  {expandedSections.related && (
                    <CardContent className="p-6">
                      <div className="space-y-2">
                        {result.relatedClaims?.map((claim: string, i: number) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-lg hover:bg-slate-100 transition-colors">
                            <p className="text-sm text-slate-700">{claim}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Action Button */}
              <div className="text-center pt-8">
                <Button 
                  onClick={resetForm} 
                  variant="outline" 
                  size="lg" 
                  className="glass hover-lift border-white/30 text-slate-700 hover:bg-white/20 px-8 py-4 rounded-2xl font-semibold text-lg"
                >
                  Check Another Claim
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
