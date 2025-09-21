"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import Link from "next/link"
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Filter,
  BookOpen,
  Shield,
  BarChart3,
  Eye,
  Share2,
  Bookmark,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react"
import { cn, getVerdictIcon } from "@/lib/utils"
import { Button } from "@/components/ui/button"
// import { useTheme } from '@/components/theme-provider'

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
  const { isSignedIn } = useUser()
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
  // const [selectedClaims, setSelectedClaims] = useState<string[]>([])
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
  const refreshRSSFeed = useCallback(async () => {
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
  }, [loadDashboardData])

  // Load data on component mount
  useEffect(() => {
    if (isSignedIn) {
      loadDashboardData()
    }
  }, [isSignedIn, loadDashboardData, refreshRSSFeed])

  // Auto-refresh every hour
  useEffect(() => {
    if (!isSignedIn) return
    
    const interval = setInterval(() => {
      refreshRSSFeed()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [isSignedIn, refreshRSSFeed])

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

  // Get source type icon - Vintage Style
  const getSourceTypeIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'government': 
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-md flex items-center justify-center shadow-sm">
            <Shield className="w-3 h-3 text-white" />
          </div>
        )
      case 'academic': 
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-md flex items-center justify-center shadow-sm">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
        )
      case 'fact-checker': 
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-green-600 to-green-700 rounded-md flex items-center justify-center shadow-sm">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        )
      case 'news': 
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-orange-600 to-orange-700 rounded-md flex items-center justify-center shadow-sm">
            <Share2 className="w-3 h-3 text-white" />
          </div>
        )
      default: 
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-md flex items-center justify-center shadow-sm">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        )
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
      <div className="min-h-screen aged-paper relative overflow-hidden flex items-center justify-center p-4">
        {/* Vintage paper overlay */}
        <div className="fixed inset-0 vintage-paper-overlay pointer-events-none z-0"></div>
        
        {/* Background Pattern */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 vintage-texture opacity-15"></div>
          <div className="absolute inset-0 sherlock-background opacity-20"></div>
        </div>

        <div className="vintage-paper-card max-w-md w-full shadow-xl relative z-10 p-8 rounded-xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-[#8b572a] to-[#654321] rounded-xl shadow-lg">
              <Eye className="h-10 w-10 text-[#f8f5f0]" />
            </div>
            <h1 className="text-2xl font-bold text-[#654321] mb-4 font-medieval-decorative">
              Authentication Required
            </h1>
            <p className="text-[#8b572a] mb-6 font-medieval">
              Please authenticate to access Athena.ai&rsquo;s Investigation Dashboard.
            </p>
            <Button asChild className="vintage-paper-button text-[#654321] font-medieval w-full">
              <Link href="/sign-in" className="justify-center">
                <Eye className="mr-2 h-4 w-4" />
                Enter Athena.ai
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen aged-paper relative overflow-hidden">
      {/* Vintage paper overlay for entire page */}
      <div className="fixed inset-0 vintage-paper-overlay pointer-events-none z-0"></div>
      
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 vintage-texture opacity-15"></div>
        <div className="absolute inset-0 sherlock-background opacity-20"></div>
        <div className="absolute inset-0 magnifying-glass-pattern opacity-10"></div>
        <div className="absolute inset-0 detective-pattern opacity-8"></div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 vintage-paper-card px-4 py-2 rounded-lg shadow-lg">
          <span className="text-[#654321] font-medieval">{showNotification}</span>
        </div>
      )}
      
      {/* Header */}
      <header className="vintage-paper-nav relative z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#8b572a] to-[#654321] rounded-lg shadow-lg">
              <Eye className="w-6 h-6 text-[#f8f5f0]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#654321] tracking-tight font-medieval-decorative">Athena.ai</h1>
              <p className="text-xs text-[#8b572a] font-medieval">AI Investigation Dashboard</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild size="sm" className="vintage-paper-button text-[#654321] font-medieval">
              <Link href="/fact-check" className="flex items-center">
                <Shield className="mr-1 h-3 w-3" />
                Investigate
              </Link>
            </Button>
            <Button asChild size="sm" className="vintage-paper-button text-[#654321] font-medieval">
              <Link href="/" className="flex items-center">
                <BookOpen className="mr-1 h-3 w-3" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout - Hugging Face Style */}
      <div className="flex relative z-10">
        {/* Sidebar - Compact Vintage Style */}
        <div className="w-60 h-screen vintage-paper-section border-r border-[#d4af8c] sticky top-0 overflow-y-auto">
          <div className="p-3">
            {/* Investigation Tasks */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#654321] mb-3 font-medieval uppercase tracking-wide">Tasks</h3>
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, category: 'all', sourceType: 'all' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#8b572a] to-[#a06535] rounded flex items-center justify-center shadow-sm">
                    <Shield className="w-2.5 h-2.5 text-[#f8f5f0]" />
                  </div>
                  Fact Verification
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, verificationStatus: 'verified' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#2d5016] to-[#4a7c59] rounded flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-2.5 h-2.5 text-[#e8f5e8]" />
                  </div>
                  Solved Cases
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, verificationStatus: 'pending' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#a06535] to-[#d4af8c] rounded flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-2.5 h-2.5 text-[#654321]" />
                  </div>
                  Active Cases
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, category: 'politics' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#4a5568] to-[#6b7280] rounded flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-2.5 h-2.5 text-[#f7fafc]" />
                  </div>
                  Analysis
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, category: 'health' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#654321] to-[#8b572a] rounded flex items-center justify-center shadow-sm">
                    <Eye className="w-2.5 h-2.5 text-[#f8f5f0]" />
                  </div>
                  Evidence Review
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8 opacity-60"
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-[#6b7280] to-[#9ca3af] rounded flex items-center justify-center shadow-sm">
                    <BookOpen className="w-2.5 h-2.5 text-[#f9fafb]" />
                  </div>
                  Documents
                  <span className="ml-auto text-xs text-[#8b572a]">+42</span>
                </Button>
              </div>
            </div>

            {/* Case Statistics */}
        {stats && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#654321] mb-3 font-medieval uppercase tracking-wide">Statistics</h3>
                <div className="space-y-2">
                  <div className="vintage-paper-card p-2 rounded">
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-xs text-[#8b572a] font-medieval">Total</p>
                        <p className="text-lg font-bold text-[#654321] font-medieval">{stats.totalClaims.toLocaleString()}</p>
                      </div>
                      <BarChart3 className="h-5 w-5 text-[#8b572a]" />
                    </div>
                  </div>
            
                  <div className="vintage-paper-card p-2 rounded">
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-xs text-[#8b572a] font-medieval">Solved</p>
                        <p className="text-lg font-bold text-green-600 font-medieval">{stats.verifiedClaims}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
            
                  <div className="vintage-paper-card p-2 rounded">
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-xs text-[#8b572a] font-medieval">Debunked</p>
                        <p className="text-lg font-bold text-red-600 font-medieval">{stats.debunkedClaims}</p>
                      </div>
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
            
                  <div className="vintage-paper-card p-2 rounded">
                <div className="flex items-center justify-between">
                  <div>
                        <p className="text-xs text-[#8b572a] font-medieval">Saved</p>
                        <p className="text-lg font-bold text-purple-600 font-medieval">{savedClaims.size}</p>
                      </div>
                      <Bookmark className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
          </div>
        )}

            {/* Source Libraries */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#654321] mb-3 font-medieval uppercase tracking-wide">Libraries</h3>
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, sourceType: 'government' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center shadow-sm">
                    <Shield className="w-2.5 h-2.5 text-white" />
                  </div>
                  Government
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, sourceType: 'academic' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-purple-600 to-purple-700 rounded flex items-center justify-center shadow-sm">
                    <BookOpen className="w-2.5 h-2.5 text-white" />
                  </div>
                  Academic
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, sourceType: 'fact-checker' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-green-600 to-green-700 rounded flex items-center justify-center shadow-sm">
                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                  </div>
                  Fact Checkers
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                  onClick={() => setFilters(prev => ({ ...prev, sourceType: 'news' }))}
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-orange-600 to-orange-700 rounded flex items-center justify-center shadow-sm">
                    <Share2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  News Media
                </Button>
              </div>
            </div>

            {/* Investigation Tools */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#654321] mb-3 font-medieval uppercase tracking-wide">Tools</h3>
              <div className="space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded flex items-center justify-center shadow-sm">
                    <Eye className="w-2.5 h-2.5 text-white" />
                  </div>
                  AI Detective
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-pink-600 to-pink-700 rounded flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-2.5 h-2.5 text-white" />
                  </div>
                  Analysis Studio
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-[#654321] hover:bg-[#f4f1e8] font-medieval text-xs h-8"
                >
                  <div className="w-4 h-4 mr-2 bg-gradient-to-br from-amber-600 to-amber-700 rounded flex items-center justify-center shadow-sm">
                    <Loader2 className="w-2.5 h-2.5 text-white" />
                  </div>
                  Quick Verify
                  <span className="ml-auto text-xs text-[#8b572a]">+13</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Compact HF Style */}
        <div className="flex-1 p-4">

          {/* Header - Compact Vintage Style */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-[#654321] font-medieval-decorative">
                  Cases <span className="text-[#8b572a] text-lg font-medieval">{filteredClaims.length.toLocaleString()}</span>
                </h1>
                <p className="text-xs text-[#8b572a] font-medieval">Investigation management and verification</p>
              </div>
              <div className="flex items-center space-x-2">
            <Button
              onClick={refreshRSSFeed}
              disabled={isRefreshing}
                  className="vintage-paper-button text-[#654321] font-medieval"
              size="sm"
            >
              {isRefreshing ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
              )}
                  Refresh
            </Button>
            
            <Button
              onClick={() => setShowFilters(!showFilters)}
                  className="vintage-paper-button text-[#654321] font-medieval"
              size="sm"
            >
                  <Filter className="mr-1 h-3 w-3" />
                  {showFilters ? 'Hide' : 'Filters'}
            </Button>
          </div>
        </div>

            {/* Search Bar - Compact Vintage Style */}
            <div className="vintage-paper-card p-3 rounded-lg mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search cases..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] placeholder-[#8b572a] font-medieval text-sm"
                  />
                </div>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] font-medieval text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="politics">Politics</option>
                    <option value="health">Health</option>
                    <option value="science">Science</option>
                    <option value="technology">Technology</option>
                  </select>
                <div className="text-xs text-[#8b572a] font-medieval whitespace-nowrap">
                  {filteredClaims.length} of {claims.length}
                </div>
              </div>
            </div>
                </div>
                
          {/* Trending Topics */}
          {stats?.trendingTopics && (
            <div className="vintage-paper-card p-3 rounded-lg mb-3">
              <h3 className="text-sm font-bold text-[#654321] mb-2 font-medieval flex items-center uppercase tracking-wide">
                <div className="w-4 h-4 mr-2 bg-gradient-to-br from-orange-600 to-red-600 rounded flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-2.5 h-2.5 text-white" />
                </div>
                Trending
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.trendingTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-[#f4f1e8] to-[#f0ede0] border border-[#d4af8c] rounded-full text-xs transition-colors cursor-pointer hover:shadow-md"
                  >
                    <span className="text-[#654321] font-medieval">{topic.topic}</span>
                    <span className="text-[#8b572a] font-medieval">({topic.count})</span>
                    {getTrendIcon(topic.trend)}
                  </div>
                ))}
              </div>
                </div>
          )}
                
          {/* Advanced Filters - Compact Style */}
          {showFilters && (
            <div className="vintage-paper-card p-3 rounded-lg mb-3">
              <h3 className="text-sm font-bold text-[#654321] mb-3 font-medieval uppercase tracking-wide">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#654321] mb-1 block font-medieval">Time</label>
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                    className="w-full p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] font-medieval text-sm"
                  >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-[#654321] mb-1 block font-medieval">Status</label>
                  <select
                    value={filters.verificationStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                    className="w-full p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] font-medieval text-sm"
                  >
                    <option value="all">All</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-[#654321] mb-1 block font-medieval">Source</label>
                  <select
                    value={filters.sourceType}
                    onChange={(e) => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
                    className="w-full p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] font-medieval text-sm"
                  >
                    <option value="all">All</option>
                    <option value="government">Government</option>
                    <option value="academic">Academic</option>
                    <option value="fact-checker">Fact Check</option>
                    <option value="news">News</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-[#654321] mb-1 block font-medieval">Sort</label>
                  <select className="w-full p-2 border border-[#d4af8c] rounded bg-[#f8f5f0] text-[#654321] font-medieval text-sm">
                    <option value="trending">Trending</option>
                    <option value="date">Recent</option>
                    <option value="credibility">Credibility</option>
                    <option value="saved">Saved</option>
                  </select>
                </div>
              </div>
            </div>
        )}

          {/* Claims List - Compact Style */}
          <div className="space-y-2">
          {isLoading ? (
              <div className="flex items-center justify-center py-8 vintage-paper-card rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#8b572a]" />
                <span className="ml-2 text-[#654321] font-medieval text-sm">Loading cases...</span>
            </div>
          ) : filteredClaims.length === 0 ? (
              <div className="vintage-paper-card p-8 rounded-lg text-center">
                <AlertCircle className="h-8 w-8 text-[#8b572a] mx-auto mb-3" />
                <h3 className="text-base font-semibold text-[#654321] mb-2 font-medieval">No cases found</h3>
                <p className="text-[#8b572a] font-medieval text-sm">Try adjusting your filters or refresh the feed.</p>
              </div>
          ) : (
            filteredClaims.map((claim) => (
                <div key={claim.id} className="vintage-paper-card rounded-lg p-4 hover:shadow-lg transition-all duration-200 border border-[#d4af8c]">
                  {/* Header - Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        {getSourceTypeIcon(claim.sourceType)}
                      <span className="text-xs text-[#8b572a] font-medieval">{claim.source}</span>
                      <span className="text-xs text-[#a06535]">•</span>
                      <span className="text-xs text-[#a06535] font-medieval">
                          {new Date(claim.publishDate).toLocaleDateString()}
                        </span>
                        {claim.trendingScore > 0.7 && (
                        <div className="flex items-center space-x-1 bg-gradient-to-r from-orange-100 to-red-100 px-1 py-0.5 rounded-full border border-orange-300">
                          <div className="w-2.5 h-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded flex items-center justify-center">
                            <AlertCircle className="w-1.5 h-1.5 text-white" />
                          </div>
                          <span className="text-xs text-orange-700 font-medieval">Hot</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Credibility Score */}
                    <div className="flex items-center space-x-1">
                      <div className="w-16 h-1.5 bg-[#f0ede0] rounded-full border border-[#d4af8c]">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            claim.credibilityScore >= 80 ? "bg-green-600" :
                            claim.credibilityScore >= 60 ? "bg-yellow-600" :
                            "bg-red-600"
                          )}
                          style={{ width: `${claim.credibilityScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#8b572a] font-medieval">{claim.credibilityScore}%</span>
                    </div>
                      </div>
                      
                  {/* Main content - Compact */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 mr-4">
                      <h3 className="text-base font-semibold text-[#654321] mb-1 font-medieval line-clamp-2">
                        {claim.title}
                      </h3>
                      
                      <p className="text-[#8b572a] mb-2 line-clamp-1 font-medieval text-sm">
                        {claim.description}
                      </p>
                      
                      {/* Tags and Category */}
                      <div className="flex items-center space-x-1 mb-2">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-[#f4f1e8] to-[#f0ede0] border border-[#d4af8c] rounded-full text-xs font-medieval text-[#654321]">
                            {claim.category}
                        </span>
                        {claim.tags.slice(0, 1).map((tag, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-[#8b572a]/10 text-[#8b572a] rounded-full text-xs font-medieval border border-[#8b572a]/20"
                          >
                            #{tag}
                          </span>
                        ))}
                        {claim.tags.length > 1 && (
                          <span className="text-xs text-[#a06535] font-medieval">+{claim.tags.length - 1}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Verdict and Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      {claim.verdict && (
                        <div className={cn(
                          "px-2 py-1 rounded text-xs font-medieval flex items-center space-x-1 border",
                          claim.verdict === 'True' ? "bg-green-50 text-green-700 border-green-300" :
                          claim.verdict === 'False' ? "bg-red-50 text-red-700 border-red-300" :
                          claim.verdict === 'Mixed' ? "bg-yellow-50 text-yellow-700 border-yellow-300" :
                          "bg-gray-50 text-gray-700 border-gray-300"
                        )}>
                          {getVerdictIcon(claim.verdict, "h-3 w-3")}
                          <span>{claim.verdict}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        <Button 
                          size="sm"
                          onClick={() => handleSaveClaim(claim.id)}
                          className={cn(
                            "vintage-paper-button text-[#654321] font-medieval h-7 px-2 text-xs",
                            savedClaims.has(claim.id) ? "bg-[#8b572a] text-[#f8f5f0]" : ""
                          )}
                        >
                          <Bookmark className={`h-2.5 w-2.5 mr-1 ${savedClaims.has(claim.id) ? "fill-current" : ""}`} />
                          {savedClaims.has(claim.id) ? "Saved" : "Save"}
                        </Button>
                        
                        <Button 
                          size="sm"
                          onClick={() => handleShareClaim(claim)}
                          className="vintage-paper-button text-[#654321] font-medieval h-7 px-2 text-xs"
                        >
                          <Share2 className="h-2.5 w-2.5" />
                        </Button>
                        
                        {claim.analysisUrl ? (
                          <Button asChild size="sm" className="vintage-paper-button text-[#654321] font-medieval h-7 px-2 text-xs">
                            <Link href={claim.analysisUrl}>
                              <Eye className="h-2.5 w-2.5 mr-1" />
                              View
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" className="vintage-paper-button text-[#654321] font-medieval h-7 px-2 text-xs">
                            <Link href={`/fact-check?claim=${encodeURIComponent(claim.title)}`}>
                              <Shield className="h-2.5 w-2.5 mr-1" />
                              Check
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            ))
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
