import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// RSS feed sources configuration - Updated with working URLs
const RSS_SOURCES = [
  {
    name: 'Snopes',
    url: 'https://www.snopes.com/feed/',
    type: 'fact-checker' as const,
    credibility: 92,
    categories: ['politics', 'health', 'science', 'technology']
  },
  {
    name: 'PolitiFact',
    url: 'https://www.politifact.com/rss/all/',
    type: 'fact-checker' as const,
    credibility: 92,
    categories: ['politics', 'health', 'science']
  },
  {
    name: 'FactCheck.org',
    url: 'https://www.factcheck.org/feed/',
    type: 'fact-checker' as const,
    credibility: 92,
    categories: ['politics', 'health', 'science']
  },
  {
    name: 'Full Fact',
    url: 'https://fullfact.org/feed/',
    type: 'fact-checker' as const,
    credibility: 92,
    categories: ['politics', 'health', 'science']
  },
  {
    name: 'BBC Reality Check',
    url: 'https://feeds.bbci.co.uk/news/reality_check/rss.xml',
    type: 'news' as const,
    credibility: 95,
    categories: ['politics', 'health', 'science', 'technology']
  },
  {
    name: 'AP Fact Check',
    url: 'https://apnews.com/apf-factcheck.rss',
    type: 'news' as const,
    credibility: 95,
    categories: ['politics', 'health', 'science']
  },
  {
    name: 'Reuters Fact Check',
    url: 'https://www.reuters.com/fact-check/feed/',
    type: 'news' as const,
    credibility: 95,
    categories: ['politics', 'health', 'science', 'technology']
  },
  {
    name: 'WHO News',
    url: 'https://www.who.int/news/rss.xml',
    type: 'government' as const,
    credibility: 98,
    categories: ['health', 'science']
  },
  {
    name: 'CDC News',
    url: 'https://tools.cdc.gov/api/v2/resources/media/132795.rss',
    type: 'government' as const,
    credibility: 98,
    categories: ['health', 'science']
  },
  {
    name: 'NIH News',
    url: 'https://www.nih.gov/news-events/news-releases/rss.xml',
    type: 'government' as const,
    credibility: 98,
    categories: ['health', 'science']
  }
];

// Types
interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  category?: string;
  source: string;
  sourceType: 'news' | 'academic' | 'government' | 'fact-checker' | 'blog' | 'unknown';
  credibility: number;
}

interface ProcessedClaim {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  sourceType: 'news' | 'academic' | 'government' | 'fact-checker' | 'blog' | 'unknown';
  publishDate: string;
  category: string;
  tags: string[];
  verdict?: 'True' | 'Mostly True' | 'Mixed' | 'Mostly False' | 'False' | 'Unverified';
  confidence?: number;
  analysisUrl?: string;
  isVerified: boolean;
  trendingScore: number;
  credibilityScore: number;
}

// Initialize Supabase client (currently unused but kept for future use)
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// Simple cache to prevent repeated failed requests
const FAILED_FEEDS_CACHE = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Parse RSS feed with improved error handling and empty claim filtering
async function parseRSSFeed(url: string): Promise<RSSItem[]> {
  // Check if this feed recently failed
  const lastFailed = FAILED_FEEDS_CACHE.get(url);
  if (lastFailed && Date.now() - lastFailed < CACHE_DURATION) {
    console.log(`Skipping ${url} - recently failed`);
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // Reduced to 6 seconds
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear timeout on successful response
    
    if (!response.ok) {
      console.warn(`RSS feed ${url} returned ${response.status}, skipping...`);
      return [];
    }
    
    const xml = await response.text();
    const items: RSSItem[] = [];
    
    // Improved XML parsing with better regex patterns
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      
      const title = extractXmlValue(itemXml, 'title');
      const description = extractXmlValue(itemXml, 'description') || extractXmlValue(itemXml, 'summary') || extractXmlValue(itemXml, 'content');
      const link = extractXmlValue(itemXml, 'link');
      const pubDate = extractXmlValue(itemXml, 'pubDate') || extractXmlValue(itemXml, 'published');
      const guid = extractXmlValue(itemXml, 'guid') || link;
      const category = extractXmlValue(itemXml, 'category');
      
      // Better validation - require title and either description or link
      if (title && title.trim().length > 10 && (description || link)) {
        const source = RSS_SOURCES.find(s => url.includes(s.url.split('/')[2]))?.name || 'Unknown';
        const sourceType = RSS_SOURCES.find(s => url.includes(s.url.split('/')[2]))?.type || 'unknown';
        const credibility = RSS_SOURCES.find(s => url.includes(s.url.split('/')[2]))?.credibility || 50;
        
        // Ensure we have meaningful content
        const cleanTitle = cleanText(title);
        const cleanDescription = description ? cleanText(description) : cleanTitle; // Use title as description if description is empty
        
        if (cleanTitle.length > 10) {
          items.push({
            title: cleanTitle,
            description: cleanDescription,
            link: link || '#',
            pubDate: pubDate || new Date().toISOString(),
            guid: guid || link || `item_${Date.now()}_${Math.random()}`,
            category: category || 'general',
            source,
            sourceType,
            credibility
          });
        }
      }
    }
    
    console.log(`Parsed ${items.length} valid items from ${url}`);
    return items;
  } catch (error: any) {
    // Cache this failed feed to avoid repeated attempts
    FAILED_FEEDS_CACHE.set(url, Date.now());
    
    if (error.name === 'AbortError') {
      console.warn(`RSS feed ${url} timed out after 6 seconds, skipping...`);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.warn(`RSS feed ${url} is unreachable, skipping...`);
    } else {
      console.warn(`RSS feed ${url} failed:`, error.message || error);
    }
    return [];
  }
}

// Extract value from XML
function extractXmlValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = regex.exec(xml);
  return match ? match[1].trim() : '';
}

// Clean text content
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract image URL from description
function extractImageFromDescription(description: string): string | null {
  if (!description) return null;
  
  // Try to extract image from HTML content
  const imgRegex = /<img[^>]+src="([^">]+)"/i;
  const match = description.match(imgRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Try to find image URLs in text
  const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i;
  const urlMatch = description.match(urlRegex);
  
  return urlMatch ? urlMatch[1] : null;
}

// Categorize claim based on content
function categorizeClaim(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('covid') || text.includes('vaccine') || text.includes('health') || text.includes('medical')) {
    return 'health';
  }
  if (text.includes('election') || text.includes('political') || text.includes('government') || text.includes('policy')) {
    return 'politics';
  }
  if (text.includes('climate') || text.includes('environment') || text.includes('research') || text.includes('study')) {
    return 'science';
  }
  if (text.includes('technology') || text.includes('ai') || text.includes('digital') || text.includes('tech')) {
    return 'technology';
  }
  if (text.includes('economy') || text.includes('financial') || text.includes('market') || text.includes('money')) {
    return 'economics';
  }
  
  return 'general';
}

// Extract tags from content
function extractTags(title: string, description: string): string[] {
  const text = (title + ' ' + description).toLowerCase();
  const tags: string[] = [];
  
  const tagKeywords = {
    'covid-19': ['covid', 'coronavirus', 'pandemic'],
    'vaccines': ['vaccine', 'vaccination', 'immunization'],
    'elections': ['election', 'vote', 'voting', 'ballot'],
    'climate': ['climate', 'global warming', 'environment'],
    'technology': ['ai', 'artificial intelligence', 'tech', 'digital'],
    'health': ['health', 'medical', 'disease', 'treatment'],
    'politics': ['political', 'government', 'policy', 'law'],
    'science': ['research', 'study', 'scientific', 'data']
  };
  
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      tags.push(tag);
    }
  }
  
  return tags.slice(0, 3); // Limit to 3 tags
}

// Calculate trending score
function calculateTrendingScore(item: RSSItem): number {
  const now = new Date();
  const publishDate = new Date(item.pubDate);
  const hoursSincePublish = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);
  
  // Recent items get higher scores
  let score = Math.max(0, 1 - (hoursSincePublish / 24));
  
  // Items with trending keywords get bonus
  const trendingKeywords = ['breaking', 'urgent', 'alert', 'warning', 'crisis', 'emergency'];
  const text = (item.title + ' ' + item.description).toLowerCase();
  if (trendingKeywords.some(keyword => text.includes(keyword))) {
    score += 0.3;
  }
  
  // Items from high-credibility sources get bonus
  if (item.credibility >= 90) {
    score += 0.2;
  }
  
  return Math.min(1, score);
}

// Process RSS items into claims
function processRSSItems(items: RSSItem[]): ProcessedClaim[] {
  return items.map((item, index) => {
    const category = categorizeClaim(item.title, item.description);
    const tags = extractTags(item.title, item.description);
    const trendingScore = calculateTrendingScore(item);
    
    return {
      id: `claim_${Date.now()}_${index}`,
      title: item.title,
      description: item.description,
      source: item.source,
      sourceUrl: item.link,
      sourceType: item.sourceType,
      publishDate: item.pubDate,
      category,
      tags,
      isVerified: false, // Will be updated by fact-checking pipeline
      trendingScore,
      credibilityScore: item.credibility
    };
  });
}

// Get dashboard statistics
function calculateStats(claims: ProcessedClaim[]): {
  totalClaims: number;
  verifiedClaims: number;
  debunkedClaims: number;
  pendingClaims: number;
  lastUpdate: string;
  trendingTopics: Array<{
    topic: string;
    count: number;
    trend: 'up' | 'stable' | 'down';
  }>;
  sourceStats: Array<{
    source: string;
    count: number;
    credibility: number;
  }>;
} {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const recentClaims = claims.filter(claim => 
    new Date(claim.publishDate) > last24Hours
  );
  
  // Since RSS claims don't have verification status, we'll calculate based on source credibility
  const highCredibilityClaims = claims.filter(claim => claim.credibilityScore >= 80).length;
  const mediumCredibilityClaims = claims.filter(claim => claim.credibilityScore >= 60 && claim.credibilityScore < 80).length;
  const lowCredibilityClaims = claims.filter(claim => claim.credibilityScore < 60).length;
  
  // For display purposes, we'll show high credibility as "verified" and low as "questionable"
  const verifiedClaims = highCredibilityClaims;
  const debunkedClaims = lowCredibilityClaims;
  const pendingClaims = mediumCredibilityClaims;
  
  // Calculate trending topics
  const topicCounts: Record<string, number> = {};
  recentClaims.forEach(claim => {
    topicCounts[claim.category] = (topicCounts[claim.category] || 0) + 1;
  });
  
  const trendingTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({
      topic,
      count,
      trend: count > 5 ? 'up' as const : count > 2 ? 'stable' as const : 'down' as const
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Calculate source statistics
  const sourceCounts: Record<string, { count: number; credibility: number }> = {};
  claims.forEach(claim => {
    if (!sourceCounts[claim.source]) {
      sourceCounts[claim.source] = { count: 0, credibility: claim.credibilityScore };
    }
    sourceCounts[claim.source].count++;
  });
  
  const sourceStats = Object.entries(sourceCounts)
    .map(([source, data]) => ({
      source,
      count: data.count,
      credibility: data.credibility
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    totalClaims: claims.length,
    verifiedClaims,
    debunkedClaims,
    pendingClaims,
    lastUpdate: now.toISOString(),
    trendingTopics,
    sourceStats
  };
}

// Main API handler - Simplified without cache
export async function GET() {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch fresh data from RSS feeds
    console.log('Fetching fresh RSS data...');
    const allItems: RSSItem[] = [];
    
    // Only use the most reliable sources to reduce errors
    const reliableSources = RSS_SOURCES.slice(0, 4); // Only use first 4 sources
    
    // Process in smaller batches to reduce load
    const batchSize = 2;
    for (let i = 0; i < reliableSources.length; i += batchSize) {
      const batch = reliableSources.slice(i, i + batchSize);
      const batchPromises = batch.map(async (source) => {
        try {
          const items = await parseRSSFeed(source.url);
          console.log(`Successfully fetched ${items.length} items from ${source.name}`);
          return items;
        } catch (error: any) {
          console.warn(`Failed to fetch from ${source.name}:`, error.message || error);
          return [];
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(items => allItems.push(...items));
      
      // Small delay between batches to be respectful to servers
      if (i + batchSize < reliableSources.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Total items fetched: ${allItems.length}`);
    
    // Process items into claims
    const claims = processRSSItems(allItems);
    
    // Calculate statistics
    const stats = calculateStats(claims);

    // Also return articles for RSS feed component
    const articles = allItems.slice(0, 10).map(item => ({
      title: item.title,
      description: item.description,
      link: item.link,
      pubDate: item.pubDate,
      source: item.source,
      imageUrl: extractImageFromDescription(item.description)
    }));

    return NextResponse.json({
      success: true,
      claims,
      articles,
      stats,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('RSS feed API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed data' },
      { status: 500 }
    );
  }
}

// Refresh RSS feed endpoint - Simplified
export async function POST() {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch fresh data
    console.log('Refreshing RSS feed...');
    const allItems: RSSItem[] = [];
    
    // Only use reliable sources for refresh as well
    const reliableSources = RSS_SOURCES.slice(0, 4);
    
    // Process in smaller batches
    const batchSize = 2;
    for (let i = 0; i < reliableSources.length; i += batchSize) {
      const batch = reliableSources.slice(i, i + batchSize);
      const batchPromises = batch.map(async (source) => {
        try {
          const items = await parseRSSFeed(source.url);
          console.log(`Refreshed ${items.length} items from ${source.name}`);
          return items;
        } catch (error: any) {
          console.warn(`Failed to refresh from ${source.name}:`, error.message || error);
          return [];
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(items => allItems.push(...items));
      
      // Small delay between batches
      if (i + batchSize < reliableSources.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const claims = processRSSItems(allItems);
    const stats = calculateStats(claims);

    return NextResponse.json({
      claims,
      stats,
      lastUpdate: new Date().toISOString(),
      message: 'RSS feed refreshed successfully'
    });

  } catch (error) {
    console.error('RSS feed refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh RSS feed' },
      { status: 500 }
    );
  }
}
