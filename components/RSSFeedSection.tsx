"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface RSSArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  imageUrl?: string;
  source: string;
}

// Define interface for the article data from API
interface ArticleData {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

export function RSSFeedSection() {
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const extractImageFromContent = useCallback((content: string): string | null => {
    if (!content) return null;
    
    // Try to extract image from HTML content
    const imgRegex = /<img[^>]+src="([^">]+)"/;
    const match = content.match(imgRegex);
    
    if (match?.[1]) {
      return match[1];
    }
    
    // Try to find image URLs in text
    const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp))/i;
    const urlMatch = content.match(urlRegex);
    
    return urlMatch?.[1] || null;
  }, []);

  const fetchRSSFeed = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/dashboard/rss');
      const data = await response.json();
      
      if (data?.success && Array.isArray(data.articles)) {
        // Get top 3 articles and extract images
        const topArticles = data.articles.slice(0, 3).map((article: ArticleData) => ({
          title: article.title || '',
          description: article.description || '',
          link: article.link || '#',
          pubDate: article.pubDate || new Date().toISOString(),
          source: article.source || 'Unknown',
          imageUrl: extractImageFromContent(article.description) || '/alt-placeholder.jpg'
        }));
        setArticles(topArticles);
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch RSS feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [extractImageFromContent]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    fetchRSSFeed();
    
    const interval = setInterval(() => {
      fetchRSSFeed();
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [fetchRSSFeed]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (isLoading) {
    return (
      <section className="py-20 aged-paper">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <RefreshCw className="w-8 h-8 text-[#8b572a]" />
            </motion.div>
            <p className="mt-4 text-[#654321] font-serif">Gathering the latest investigative reports...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 aged-paper relative">
      <div className="absolute inset-0 vintage-texture opacity-30"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-serif text-[#654321] sketch-texture">
            Latest Investigative Reports
          </h2>
          <p className="text-xl text-[#8b572a] max-w-3xl mx-auto leading-relaxed font-serif">
            Stay informed with the most recent developments in our ongoing investigations
          </p>
          
          {/* Refresh Info */}
          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-[#a06535]">
            <Clock className="w-4 h-4" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <Button
              onClick={fetchRSSFeed}
              disabled={isRefreshing}
              variant="ghost"
              size="sm"
              className="ml-2 text-[#8b572a] hover:text-[#654321]"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Articles Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((article, index) => (
            <motion.article
              key={article.link}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="vintage-paper-card rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 sketch-texture"
            >
              {/* Article Image */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={article.imageUrl || '/alt-placeholder.jpg'}
                  alt={article.title}
                  fill
                  className="object-cover sepia-filter hover:sepia-0 transition-all duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/alt-placeholder.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#654321]/20 to-transparent"></div>
              </div>

              {/* Article Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-[#8b572a] bg-[#f4f1e8] px-2 py-1 rounded border border-[#d4af8c]">
                    {article.source}
                  </span>
                  <span className="text-xs text-[#a06535] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(article.pubDate)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#654321] mb-3 line-clamp-2 font-serif hover:text-[#8b572a] transition-colors">
                  {article.title}
                </h3>

                <p className="text-[#8b572a] text-sm leading-relaxed mb-4 line-clamp-3">
                  {article.description.replace(/<[^>]*>/g, '').substring(0, 120)}...
                </p>

                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#654321] hover:text-[#8b572a] font-semibold text-sm transition-colors group"
                >
                  Investigate Further
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Detective Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <blockquote className="text-xl font-serif italic text-[#654321] max-w-2xl mx-auto">
            &ldquo;The game is afoot! Every piece of information brings us closer to the truth.&rdquo;
            <footer className="text-[#8b572a] mt-2 font-medium">— Detective&apos;s Creed</footer>
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}
