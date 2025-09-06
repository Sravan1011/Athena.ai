"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import Image from "next/image"
import {
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  BookOpen,
  Shield,
  FileText,
  BarChart3,
  Settings,
  Bell,
  ExternalLink,
  Calendar,
  Users,
  Zap,
  Globe,
  Target,
  Activity,
  Eye,
  Share2,
  Bookmark,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
  Star,
  Flame,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react"
import { cn, formatConfidence, getVerdictIcon, formatProcessingTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { ThemeSwitcher } from '@/components/theme-switcher'
import { useTheme } from '@/components/theme-provider'

// Types for RSS feed and dashboard data
interface RSSClaim {
  id: string
  title: string
  description: string
  source: string
  sourceUrl: string
  sourceType: "news" | "academic" | "government" | "fact-checker" | "blog" | "unknown"
  publishDate: string
  category: string
  tags: string[]
  verdict?: "True" | "Mostly True" | "Mixed" | "Mostly False" | "False" | "Unverified"
  confidence?: number
  analysisUrl?: string
  isVerified: boolean
  trendingScore: number
  credibilityScore: number
}

interface DashboardStats {
  totalClaims: number
  verifiedClaims: number
  pendingClaims: number
  debunkedClaims: number
  lastUpdate: string
  trendingTopics: Array<{
    topic: string
    count: number
    trend: "up" | "down" | "stable"
  }>
  sourceStats: Array<{
    source: string
    count: number
    credibility: number
  }>
}

interface FilterOptions {
  category: string
  sourceType: string
  timeRange: string
  verificationStatus: string
  searchQuery: string
}

export default function DashboardPage() {
  const { user, isSignedIn } = useUser()
  const { theme } = useTheme()
  const [claims, setClaims] = useState<RSSClaim[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    category: "all",
    sourceType: "all",
    timeRange: "24h",
    verificationStatus: "all",
    searchQuery: ""
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [savedClaims, setSavedClaims] = useState<Set<string>>(new Set())
  const [showNotification, setShowNotification] = useState<string | null>(null)

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!isSignedIn) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/rss')
      if (response.ok) {
        const data = await response.json()
        setClaims(data.claims || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn])

  // Refresh RSS feed
  const refreshRSSFeed = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/dashboard/rss/refresh', {
        method: 'POST'
      })
      if (response.ok) {
        await loadDashboardData()
      }
    } catch (error) {
      console.error('Failed to refresh RSS feed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (isSignedIn) {
      loadDashboardData()
    }
  }, [isSignedIn, loadDashboardData])

  // Auto-refresh every hour
  useEffect(() => {
    if (!isSignedIn) return
    
    const interval = setInterval(() => {
      refreshRSSFeed()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [isSignedIn])

  // Filter claims based on current filters
  const filteredClaims = claims.filter(claim => {
    if (filters.category !== "all" && claim.category !== filters.category) return false
    if (filters.sourceType !== "all" && claim.sourceType !== filters.sourceType) return false
    if (filters.verificationStatus !== "all") {
      if (filters.verificationStatus === "verified" && !claim.isVerified) return false
      if (filters.verificationStatus === "pending" && claim.isVerified) return false
    }
    if (filters.searchQuery && !claim.title.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false
    return true
  })

  // Get source type icon
  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'government': return <Shield className="w-4 h-4 text-blue-600" />
      case 'academic': return <BookOpen className="w-4 h-4 text-purple-600" />
      case 'fact-checker': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'news': return <FileText className="w-4 h-4 text-orange-600" />
      default: return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  // Get verdict color
  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'True': return 'text-green-600 bg-green-50'
      case 'Mostly True': return 'text-green-500 bg-green-25'
      case 'False': return 'text-red-600 bg-red-50'
      case 'Mostly False': return 'text-red-500 bg-red-25'
      case 'Mixed': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-3 h-3 text-green-500" />
      case 'down': return <ArrowDown className="w-3 h-3 text-red-500" />
      default: return <Minus className="w-3 h-3 text-gray-500" />
    }
  }

  // Handle save claim
  const handleSaveClaim = (claimId: string) => {
    setSavedClaims(prev => {
      const newSaved = new Set(prev)
      if (newSaved.has(claimId)) {
        newSaved.delete(claimId)
        setShowNotification('Claim removed from saved items')
      } else {
        newSaved.add(claimId)
        setShowNotification('Claim saved successfully!')
      }
      return newSaved
    })
    
    // Hide notification after 3 seconds
    setTimeout(() => setShowNotification(null), 3000)
  }

  // Handle share claim
  const handleShareClaim = async (claim: RSSClaim) => {
    const shareData = {
      title: claim.title,
      text: claim.description,
      url: claim.sourceUrl
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        setShowNotification('Shared successfully!')
      } catch (error) {
        console.log('Error sharing:', error)
        setShowNotification('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      const shareText = `${claim.title}\n\n${claim.description}\n\nSource: ${claim.sourceUrl}`
      try {
        await navigator.clipboard.writeText(shareText)
        setShowNotification('Claim details copied to clipboard!')
      } catch (error) {
        console.log('Error copying to clipboard:', error)
        setShowNotification('Failed to copy to clipboard')
      }
    }
    
    // Hide notification after 3 seconds
    setTimeout(() => setShowNotification(null), 3000)
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-sm">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <CardTitle className="text-xl font-semibold text-gray-900">
              Sign In Required
            </CardTitle>
            <CardDescription>Please sign in to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-3">
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
    <div className="min-h-screen bg-background">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          {showNotification}
        </div>
      )}
      
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-lg border-2 border-gray-200">
              <Image 
                src="/clean-logo.svg" 
                alt="Athena.ai Logo" 
                width={40} 
                height={40}
                className="w-10 h-10 object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Athena.ai</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Fact Checking Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeSwitcher />
            <Button asChild variant="outline" size="sm">
              <Link href="/fact-check" className="flex items-center">
                <Shield className="mr-2 h-4 w-4" />
                Fact Check Tool
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Claims</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalClaims}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">High Credibility</p>
                    <p className="text-2xl font-bold text-green-600">{stats.verifiedClaims}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Credibility</p>
                    <p className="text-2xl font-bold text-red-600">{stats.debunkedClaims}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saved Claims</p>
                    <p className="text-2xl font-bold text-purple-600">{savedClaims.size}</p>
                  </div>
                  <Bookmark className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trending Topics */}
        {stats?.trendingTopics && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Trending Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.trendingTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-3 py-1 bg-muted rounded-full text-sm"
                  >
                    <span className="text-foreground">{topic.topic}</span>
                    <span className="text-muted-foreground">({topic.count})</span>
                    {getTrendIcon(topic.trend)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              onClick={refreshRSSFeed}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Feed
            </Button>
            
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredClaims.length} of {claims.length} claims
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="all">All Categories</option>
                    <option value="politics">Politics</option>
                    <option value="health">Health</option>
                    <option value="science">Science</option>
                    <option value="technology">Technology</option>
                    <option value="economics">Economics</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Source Type</label>
                  <select
                    value={filters.sourceType}
                    onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="all">All Sources</option>
                    <option value="government">Government</option>
                    <option value="academic">Academic</option>
                    <option value="fact-checker">Fact Checker</option>
                    <option value="news">News</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Time Range</label>
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
                  <input
                    type="text"
                    placeholder="Search claims..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claims List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading claims...</span>
            </div>
          ) : filteredClaims.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No claims found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or refresh the feed.</p>
              </CardContent>
            </Card>
          ) : (
            filteredClaims.map((claim) => (
              <Card key={claim.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getSourceTypeIcon(claim.sourceType)}
                        <span className="text-sm text-muted-foreground">{claim.source}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(claim.publishDate).toLocaleDateString()}
                        </span>
                        {claim.trendingScore > 0.7 && (
                          <div className="flex items-center space-x-1">
                            <Flame className="h-3 w-3 text-orange-500" />
                            <span className="text-xs text-orange-600">Trending</span>
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {claim.title}
                      </h3>
                      
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {claim.description}
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Category:</span>
                          <span className="px-2 py-1 bg-muted rounded-full text-xs font-medium">
                            {claim.category}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">Credibility:</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-16 h-1 bg-gray-200 rounded-full">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  claim.credibilityScore >= 80 ? "bg-green-500" :
                                  claim.credibilityScore >= 60 ? "bg-yellow-500" :
                                  "bg-red-500"
                                )}
                                style={{ width: `${claim.credibilityScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{claim.credibilityScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {claim.verdict && (
                        <div className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1",
                          getVerdictColor(claim.verdict)
                        )}>
                          {getVerdictIcon(claim.verdict, "h-3 w-3")}
                          <span>{claim.verdict}</span>
                        </div>
                      )}
                      
                      {claim.confidence && (
                        <div className="text-xs text-muted-foreground">
                          {formatConfidence(claim.confidence)} confidence
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {claim.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSaveClaim(claim.id)}
                        className={savedClaims.has(claim.id) ? "bg-primary text-primary-foreground" : ""}
                      >
                        <Bookmark className={`h-3 w-3 mr-1 ${savedClaims.has(claim.id) ? "fill-current" : ""}`} />
                        {savedClaims.has(claim.id) ? "Saved" : "Save"}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleShareClaim(claim)}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                      
                      {claim.analysisUrl ? (
                        <Button asChild size="sm">
                          <Link href={claim.analysisUrl}>
                            <Eye className="h-3 w-3 mr-1" />
                            View Analysis
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href={`/fact-check?claim=${encodeURIComponent(claim.title)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            Fact Check
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
