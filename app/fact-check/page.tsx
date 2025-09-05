"use client"

import { useState, useRef, useEffect } from "react"
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
  Send,
  History,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"
import { cn, formatConfidence, getVerdictColor, getVerdictIcon, formatProcessingTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from '@/components/theme-provider'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Conversation, Message } from '@/lib/supabase'

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

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  result?: FactCheckResult;
  timestamp: Date;
}

export default function FactCheckPage() {
  const { user, isSignedIn } = useUser()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<FactCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: false,
    reasoning: false,
    sources: false,
    related: false
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, isLoading])

  // Load conversations when user signs in
  useEffect(() => {
    if (isSignedIn) {
      loadConversations()
    }
  }, [isSignedIn])

  const onSubmit = async (data: FactCheckForm) => {
    if (!isSignedIn) {
      setError("Please sign in to use the fact checker")
      return
    }

    const claim = data.claim.trim()
    if (!claim) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      let conversationId = currentConversationId
      
      // Create new conversation if none exists
      if (!conversationId) {
        conversationId = await createNewConversation(`Fact-check: ${claim.substring(0, 50)}...`)
        if (!conversationId) {
          throw new Error('Failed to create conversation')
        }
      }

      // Add user message to chat and save to DB
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: claim,
        timestamp: new Date()
      }
      
      setChatHistory(prev => [...prev, userMessage])
      setCurrentInput("")
      await saveMessage(conversationId, 'user', claim)
      // Try enhanced fact-check first
      const enhancedResponse = await fetch("/api/enhanced-fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claim }),
      })

      if (enhancedResponse.ok) {
        const enhancedData = await enhancedResponse.json()
        
        const factCheckResult: FactCheckResult = {
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
        }

        // Add assistant response to chat
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `Analysis complete: ${factCheckResult.verdict}`,
          result: factCheckResult,
          timestamp: new Date()
        }

        setChatHistory(prev => [...prev, assistantMessage])
        setResult(factCheckResult)
        
        // Save assistant response to database
        await saveMessage(conversationId, 'assistant', 'Fact-check analysis complete', {
          fact_check_result: factCheckResult,
          confidence_score: factCheckResult.confidence
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

      if (!resultData.verdict || !resultData.explanation || !resultData.claim?.text) {
        throw new Error("Invalid response format from the server")
      }

      const factCheckResult = {
        ...resultData,
        sources: resultData.sources || [],
        processingTimeMs: resultData.processingTimeMs || 0,
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Analysis complete: ${factCheckResult.verdict}`,
        result: factCheckResult,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, assistantMessage])
      setResult(factCheckResult)
      
      // Save assistant response to database
      await saveMessage(conversationId, 'assistant', 'Fact-check analysis complete', {
        fact_check_result: factCheckResult,
        confidence_score: factCheckResult.confidence
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setError(errorMessage)
      
      // Add error message to chat
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }


  // Load user's conversations
  const loadConversations = async () => {
    if (!isSignedIn) return
    
    setLoadingConversations(true)
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Create new conversation
  const createNewConversation = async (title?: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'New Fact Check' })
      })
      
      if (response.ok) {
        const conversation = await response.json()
        setCurrentConversationId(conversation.id)
        setConversations(prev => [conversation, ...prev])
        return conversation.id
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
    return null
  }

  // Save message to database
  const saveMessage = async (conversationId: number, role: 'user' | 'assistant', content: string, metadata?: any) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, metadata })
      })
      
      if (!response.ok) {
        console.error('Failed to save message')
      }
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  // Load conversation messages
  const loadConversation = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (response.ok) {
        const messages = await response.json()
        
        // Convert to your existing ChatMessage format with full fact-check results
        const chatMessages: ChatMessage[] = messages.map((msg: Message) => ({
          id: msg.id.toString(),
          type: msg.role,
          content: msg.content,
          result: msg.metadata?.fact_check_result || undefined, // Restore fact-check results
          timestamp: new Date(msg.created_at)
        }))
        
        setChatHistory(chatMessages)
        setCurrentConversationId(conversationId)
        
        // Set the result from the last assistant message with fact-check data
        const lastAssistantMessage = messages.filter((m: Message) => m.role === 'assistant').pop()
        if (lastAssistantMessage?.metadata?.fact_check_result) {
          setResult(lastAssistantMessage.metadata.fact_check_result)
        } else {
          setResult(null)
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  // Delete conversation
  const deleteConversation = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Remove from conversations list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        // If this was the current conversation, start a new chat
        if (currentConversationId === conversationId) {
          startNewChat()
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const startNewChat = () => {
    setChatHistory([])
    setResult(null)
    setError(null)
    setCurrentInput("")
    setCurrentConversationId(null)
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
      <div className="min-h-screen bg-theme-background flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-theme-background flex">
      {/* Sidebar */}
      <div className={`perplexity-sidebar transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 overflow-visible relative group`}>
        {/* Pull-out indicator when collapsed */}
        {sidebarCollapsed && (
          <>
            {/* Invisible hover zone */}
            <div 
              className="absolute -right-6 top-0 w-6 h-full cursor-pointer z-5"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
            />
            
            {/* Visual pull-out tab */}
            <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="bg-theme-accent text-theme-accent-foreground hover:bg-theme-accent/90 w-6 h-16 rounded-r-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group animate-pulse hover:animate-none hover:scale-105"
                title="Expand sidebar"
              >
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-0.5 h-3 bg-current rounded-full opacity-60"></div>
                  <div className="flex flex-col space-y-0.5">
                    <div className="w-1 h-1 bg-current rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="w-1 h-1 bg-current rounded-full group-hover:scale-125 transition-transform delay-75"></div>
                    <div className="w-1 h-1 bg-current rounded-full group-hover:scale-125 transition-transform delay-150"></div>
                  </div>
                  <div className="w-0.5 h-3 bg-current rounded-full opacity-60"></div>
                </div>
              </button>
            </div>
          </>
        )}
        
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-theme-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <span className="text-sm font-semibold text-theme-foreground whitespace-nowrap">ClaimAI</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-theme-muted hover:text-theme-foreground h-6 w-6 p-0"
              >
                <div className="transition-transform duration-300 ease-in-out">
                  {sidebarCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </div>
              </Button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'h-0 opacity-0 p-0' : 'h-auto opacity-100 p-3'} overflow-hidden`}>
            <Button
              onClick={startNewChat}
              className="w-full bg-theme-accent text-theme-accent-foreground hover:opacity-90 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'opacity-0 transform -translate-x-4' : 'opacity-100 transform translate-x-0'} overflow-hidden`}>
              {conversations.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-theme-muted">
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                  {conversations.slice(0, 10).map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className={`group relative rounded-md hover:bg-theme-surface-hover transition-all duration-200 ${
                        currentConversationId === conversation.id ? 'bg-theme-surface border border-theme-border' : ''
                      }`}
                      style={{ 
                        animation: !sidebarCollapsed ? `slideInLeft 0.3s ease-out forwards ${index * 50}ms` : 'none'
                      }}
                    >
                      <button
                        onClick={() => loadConversation(conversation.id)}
                        className="w-full text-left px-2 py-1.5 cursor-pointer"
                      >
                        <p className="text-xs text-theme-foreground truncate pr-6">{conversation.title}</p>
                        <p className="text-xs text-theme-muted">
                          {new Date(conversation.updated_at).toLocaleDateString()}
                        </p>
                      </button>
                      
                      {/* Delete button - shows on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conversation.id)
                        }}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {loadingConversations && (
                <div className="px-2 py-4 text-center">
                  <div className="text-xs text-theme-muted">Loading conversations...</div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'h-0 opacity-0 p-0' : 'h-auto opacity-100 p-3'} overflow-hidden border-t border-theme-border space-y-3`}>
            <div className={`transition-all duration-600 ease-in-out delay-100 ${sidebarCollapsed ? 'transform translate-y-4 opacity-0' : 'transform translate-y-0 opacity-100'}`}>
              <ThemeSwitcher />
            </div>
            <div className={`transition-all duration-600 ease-in-out delay-200 ${sidebarCollapsed ? 'transform translate-y-4 opacity-0' : 'transform translate-y-0 opacity-100'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-5 h-5 bg-theme-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-theme-background">
                    {(safeUser?.firstName || safeUser?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-theme-foreground truncate">
                  {safeUser?.firstName || safeUser?.email}
                </span>
              </div>
              <SignOutButton>
                <Button variant="ghost" size="sm" className="text-theme-muted hover:text-theme-foreground h-6 w-6 p-0 flex-shrink-0 transition-all duration-200 hover:scale-110">
                  <Settings className="h-3 w-3" />
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header with Logo */}
        <header className="bg-theme-background border-b border-theme-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-lg border-2 border-gray-200 logo-container">
                <Image 
                  src="/clean-logo.svg" 
                  alt="ClaimAI Logo" 
                  width={40} 
                  height={40}
                  className="w-10 h-10 object-contain logo-image"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-theme-foreground tracking-tight">ClaimAI</h1>
                <p className="text-sm text-theme-muted">AI-Powered Fact Checking</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/" className="flex items-center">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
            </div>
          </div>
        </header>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Empty State */}
          {chatHistory.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center px-4">
              <div className="w-12 h-12 bg-theme-accent rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-theme-accent-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-theme-foreground mb-3">
                Fact Check Any Claim
              </h1>
              <p className="text-theme-muted max-w-md text-sm leading-relaxed">
                Ask questions, verify claims, or analyze statements. I'll help you separate fact from fiction using AI-powered analysis.
              </p>
              
              {/* Quick Examples */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                {[
                  "The Earth's average temperature has increased by 1.1°C since 1880",
                  "Vaccines contain microchips for tracking",
                  "Coffee can reduce the risk of type 2 diabetes",
                  "5G networks cause COVID-19"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentInput(example)}
                    className="perplexity-message p-3 text-left hover:bg-theme-surface-hover transition-colors text-xs"
                  >
                    <p className="text-theme-foreground leading-relaxed">{example}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="max-w-3xl mx-auto space-y-4">
            {chatHistory.map((message) => (
              <div key={message.id} className="space-y-3">
                {/* User Message */}
                {message.type === 'user' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-theme-accent rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-theme-accent-foreground text-xs font-medium">U</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-theme-foreground text-sm leading-relaxed">{message.content}</p>
                      <p className="text-theme-muted text-xs mt-1">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}

                {/* Assistant Message */}
                {message.type === 'assistant' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="h-3 w-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-theme-foreground text-sm mb-2">{message.content}</p>
                      {message.result && (
                        <div className="perplexity-chat p-4 mt-3">
                          <FactCheckResult result={message.result} />
                        </div>
                      )}
                      <p className="text-theme-muted text-xs mt-2">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <div className="perplexity-message p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin text-theme-accent" />
                      <span className="text-theme-foreground text-sm">Analyzing claim...</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 bg-theme-surface rounded animate-pulse"></div>
                      <div className="h-1.5 bg-theme-surface rounded animate-pulse w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-t border-theme-border bg-theme-background">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <div className="relative flex items-end">
                <textarea
                  ref={textareaRef}
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (currentInput.trim()) {
                        onSubmit({ claim: currentInput })
                      }
                    }
                  }}
                  placeholder="Ask anything or fact-check a claim..."
                  className="perplexity-search w-full px-4 py-3 pr-20 resize-none text-sm placeholder:text-theme-muted-foreground focus:outline-none min-h-[44px] max-h-32"
                  disabled={isLoading}
                  rows={1}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <button
                    type="button"
                    className="h-7 w-7 p-0 bg-theme-surface hover:bg-theme-surface-hover rounded-md border border-theme-border flex items-center justify-center transition-colors"
                    disabled={isLoading}
                    title="Keyboard shortcut: Cmd+Enter"
                  >
                    <span className="text-xs text-theme-muted font-mono">⌘</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentInput.trim() && !isLoading) {
                        onSubmit({ claim: currentInput })
                      }
                    }}
                    disabled={isLoading || !currentInput.trim()}
                    className="bg-theme-accent text-theme-accent-foreground hover:opacity-90 disabled:opacity-50 h-7 w-7 p-0 rounded-md flex items-center justify-center transition-all"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
            
            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Separate component for fact-check results
function FactCheckResult({ result }: { result: FactCheckResult }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    evidence: false,
    reasoning: false,
    sources: false,
    related: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="space-y-4">
      {/* Main Result */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5",
              result.verdict === "True" ? "bg-green-100 text-green-700" :
              result.verdict === "False" ? "bg-red-100 text-red-700" :
              "bg-yellow-100 text-yellow-700"
            )}
          >
            {getVerdictIcon(result.verdict, "h-3 w-3")}
            <span>{result.verdict}</span>
          </div>
          {result.confidence && (
            <span className="text-theme-muted text-xs">
              {formatConfidence(result.confidence)} confidence
            </span>
          )}
        </div>
        {result.processingTimeMs && (
          <span className="text-theme-muted text-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatProcessingTime(result.processingTimeMs)}
          </span>
        )}
      </div>

      {/* Explanation */}
      <div>
        <h3 className="text-sm font-semibold text-theme-foreground mb-2">Analysis</h3>
        <p className="text-sm text-theme-foreground leading-relaxed">{result.explanation}</p>
      </div>

      {/* Expandable Sections */}
      {result.sources && result.sources.length > 0 && (
        <div className="border-t border-theme-border pt-4">
          <button
            onClick={() => toggleSection('sources')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="notion-h3-themed">Sources ({result.sources.length})</h3>
            {expandedSections.sources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedSections.sources && (
            <div className="mt-4 space-y-3">
              {result.sources.slice(0, 5).map((source, index) => (
                <div key={index} className="p-3 bg-theme-surface rounded-lg border border-theme-border">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="notion-body-themed font-medium">{source.title}</h4>
                    <span className="notion-body-sm-themed text-theme-muted">
                      {source.credibilityScore}%
                    </span>
                  </div>
                  <p className="notion-body-sm-themed text-theme-muted mb-2">{source.excerpt}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-accent hover:underline notion-body-sm-themed flex items-center"
                  >
                    {source.domain}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}