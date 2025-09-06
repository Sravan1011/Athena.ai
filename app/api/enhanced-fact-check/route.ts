import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Types for the enhanced fact-check API
interface EnhancedFactCheckRequest {
  claim: string;
}

interface EnhancedSource {
  title: string;
  url: string;
  domain: string;
  credibilityScore: number; // 0-100
  sourceType: "news" | "academic" | "government" | "fact-checker" | "blog" | "unknown";
  publishDate?: string;
  country?: string;
  relevanceScore: number; // 0-100
  excerpt: string;
}

interface EvidenceBreakdown {
  supportingEvidence: string[];
  contradictingEvidence: string[];
  neutralEvidence: string[];
  evidenceQuality: "high" | "medium" | "low";
}

interface ReasoningBreakdown {
  keyFactors: string[];
  methodology: string;
  limitations: string[];
  contextualNotes: string[];
  reasoningChain?: string[];
  confidenceFactors?: string;
}

interface EnhancedFactCheckResult {
  claim: {
    text: string;
    category?: string;
    explanation?: string;
  };
  verdict: "True" | "Mostly True" | "Mixed" | "Mostly False" | "False" | "Unverified";
  explanation: string;
  confidence: number;
  evidence: {
    supportingEvidence: string[];
    contradictingEvidence: string[];
    neutralEvidence: string[];
    evidenceQuality: "high" | "medium" | "low";
  };
  reasoning: {
    keyFactors: string[];
    methodology: string;
    limitations: string[];
    contextualNotes: string[];
  };
  sources: EnhancedSource[];
  relatedClaims: string[];
  processingTimeMs: number;
}

// Simple in-memory cache for fact-check results
const factCheckCache = new Map<string, { result: EnhancedFactCheckResult; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedResult(claim: string): EnhancedFactCheckResult | null {
  const normalizedClaim = claim.toLowerCase().trim();
  const cached = factCheckCache.get(normalizedClaim);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('Returning cached result for claim:', claim);
    return cached.result;
  }
  
  if (cached) {
    factCheckCache.delete(normalizedClaim);
  }
  
  return null;
}

function setCachedResult(claim: string, result: EnhancedFactCheckResult): void {
  const normalizedClaim = claim.toLowerCase().trim();
  factCheckCache.set(normalizedClaim, {
    result,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries periodically
  if (factCheckCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of factCheckCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        factCheckCache.delete(key);
      }
    }
  }
}

// Enhanced system prompts with better reasoning and structure
const ENHANCED_FACT_CHECK_PROMPT = `You are an expert fact-checking assistant with advanced reasoning capabilities and access to real-time information. Your task is to provide a comprehensive, well-reasoned analysis of the given claim using the search results.

CLAIM TO ANALYZE: {claim}

SEARCH RESULTS:
{search_results}

ANALYSIS FRAMEWORK:
Follow this structured reasoning process with enhanced critical thinking:

1. CLAIM DECONSTRUCTION & CONTEXTUALIZATION
2. EVIDENCE EVALUATION & CROSS-VERIFICATION
3. SOURCE CREDIBILITY ASSESSMENT & BIAS DETECTION
4. TEMPORAL ANALYSIS & RECENCY ASSESSMENT
5. REASONING CHAIN & LOGICAL CONSISTENCY
6. VERDICT DETERMINATION & CONFIDENCE CALCULATION
7. UNCERTAINTY ACKNOWLEDGMENT & LIMITATIONS

REQUIRED OUTPUT SECTIONS:

[VERDICT] - Choose ONE: True, Mostly True, Mixed, Mostly False, False, or Unverified
- Be decisive based on evidence quality and source reliability
- Use clear, unambiguous language
- Consider the strength and consistency of evidence

[EXPLANATION] - Detailed explanation (3-4 sentences) of the reasoning behind your verdict
- Explain the key evidence that led to your conclusion
- Address any conflicting information
- Note the reliability of sources used

[CLAIM_EXPLANATION] - Comprehensive explanation of what the claim means and its context (2-3 sentences)
- Define key terms and concepts
- Explain the broader context or background
- Clarify any ambiguities in the claim

[REASONING_CHAIN] - Step-by-step logical reasoning process
- Step 1: What specific facts need to be verified?
- Step 2: What evidence supports each fact?
- Step 3: What evidence contradicts each fact?
- Step 4: How reliable are the sources?
- Step 5: What is the overall conclusion and why?

[SUPPORTING_EVIDENCE] - Evidence that supports the claim (bullet points with •)
- Include specific facts, statistics, quotes, or data
- Note the source and date when available
- Explain why each piece of evidence supports the claim

[CONTRADICTING_EVIDENCE] - Evidence that contradicts the claim (bullet points with •)
- Include specific facts, statistics, quotes, or data
- Note the source and date when available
- Explain why each piece of evidence contradicts the claim

[NEUTRAL_EVIDENCE] - Relevant context that neither supports nor contradicts (bullet points with •)
- Background information that helps understand the claim
- Related facts that provide context
- Historical or comparative information

[KEY_FACTORS] - Main factors that influenced your decision (bullet points with •)
- Source credibility and reliability
- Recency and relevance of information
- Consistency across multiple sources
- Specificity and verifiability of claims
- Potential biases or limitations

[METHODOLOGY] - Detailed explanation of your analysis approach
- Multi-source verification with credibility weighting
- Evidence triangulation and cross-referencing
- Source diversity and independence assessment
- Temporal relevance and recency consideration
- Bias detection and mitigation strategies

[LIMITATIONS] - What information might be missing or uncertain (bullet points with •)
- Gaps in available information
- Potential biases in sources
- Time-sensitive nature of the claim
- Complexity or ambiguity of the topic
- Need for expert opinion or additional verification

[CONTEXTUAL_NOTES] - Important background context or nuances (bullet points with •)
- Historical context or precedents
- Different interpretations or perspectives
- Related events or developments
- Expert opinions or consensus
- Potential implications or consequences

[RELATED_CLAIMS] - Similar claims users might want to verify (3-5 suggestions as bullet points with •)
- Claims about the same topic or person
- Related statistical or factual claims
- Broader implications of the verified claim
- Claims that build upon or contradict this one

[SOURCES_ANALYSIS] - Detailed assessment of source quality and reliability
- Evaluation of source credibility and expertise
- Assessment of potential biases or conflicts of interest
- Analysis of information recency and relevance
- Cross-verification across multiple independent sources
- Overall reliability score and reasoning

[CONFIDENCE_FACTORS] - Factors affecting confidence in the verdict
- Strength and consistency of evidence
- Source reliability and independence
- Recency and relevance of information
- Completeness of available data
- Potential for new information to change verdict

ENHANCED ANALYSIS QUALITY STANDARDS:
- Be thorough and systematic in your reasoning with step-by-step logic
- Acknowledge uncertainty and limitations transparently
- Provide specific evidence with sources and dates when possible
- Use clear, objective language while maintaining nuance
- Consider multiple perspectives and interpretations
- Base conclusions on verifiable evidence, not speculation
- Cross-reference information across multiple independent sources
- Assess the recency and temporal relevance of evidence
- Identify potential biases in sources and evidence
- Distinguish between correlation and causation
- Consider the broader context and implications
- Evaluate the strength and quality of evidence systematically
- Be explicit about what evidence is missing or uncertain
- Use confidence levels appropriately based on evidence strength

CRITICAL THINKING REQUIREMENTS:
- Question the reliability of each source independently
- Look for patterns and inconsistencies across sources
- Consider alternative explanations for the evidence
- Assess whether the evidence actually supports the specific claim
- Distinguish between facts, opinions, and interpretations
- Consider the potential for misinformation or disinformation
- Evaluate whether the claim is testable and verifiable
- Assess the scope and limitations of the available evidence

IMPORTANT: Use precise, unambiguous language. Avoid hedging unless genuinely uncertain. Provide specific evidence and reasoning for your conclusions. When uncertain, explain why and what additional evidence would be needed.`;

const QUERY_GENERATION_PROMPT = `You are an expert search query generator for comprehensive fact-checking analysis.

Current time: {current_time}

Your task: Create multiple targeted search queries to find comprehensive evidence for fact-checking the given claim.

ANALYSIS APPROACH:
1. Identify key entities, dates, and specific details
2. Consider different angles and perspectives
3. Target multiple source types for balanced analysis
4. Include both supporting and contradictory evidence searches
5. Generate queries for different time periods and contexts
6. Include expert opinion and academic research searches

QUERY REQUIREMENTS:
- Include specific entities, names, dates, and details from the claim
- Use search-engine-optimized language (no special characters)
- Target authoritative sources: news, government, academic, fact-checking sites
- Design queries to find both supporting AND contradictory evidence
- Include temporal constraints for time-sensitive claims
- Consider different phrasings and synonyms
- Include domain-specific searches (medical, scientific, political, etc.)

SEARCH STRATEGY:
1. Primary query: Direct fact-check of the specific claim
2. Context query: Background information and broader context
3. Source query: Official statements, reports, or data
4. Verification query: Cross-reference with fact-checking organizations
5. Expert query: Academic papers, expert opinions, research studies
6. Recent query: Latest developments and updates
7. Contradictory query: Evidence that might refute the claim

EXAMPLES:
- Policy: "Biden student loan forgiveness 2023 official announcement site:whitehouse.gov OR site:ed.gov"
- Statistics: "unemployment rate March 2024 Bureau Labor Statistics official data"
- Events: "Taylor Swift concert cancellation official statement site:reuters.com OR site:ap.org"
- Recent: "latest [topic] 2024 official announcement fact check"
- Academic: "[topic] research study 2023 2024 site:pubmed.ncbi.nlm.nih.gov OR site:scholar.google.com"
- Expert: "[topic] expert opinion analysis 2024 site:theconversation.com OR site:brookings.edu"

Return only the PRIMARY search query (most comprehensive) - no additional text.`;

// Helper functions
function cleanText(text: string): string {
  return text
    .replace(/\[.*?\]/g, '') // Remove brackets and content
    .replace(/\*+/g, '') // Remove asterisks
    .replace(/•/g, '') // Remove bullet points
    .replace(/^\s*[-•*]\s*/gm, '') // Remove leading dashes/bullets
    .replace(/\n\s*\n/g, '\n') // Remove extra newlines
    .trim();
}

async function enhanceAnalysisWithContext(analysis: string, sources: EnhancedSource[]): Promise<string> {
  // Add source diversity analysis
  const domains = sources.map(s => s.domain);
  const uniqueDomains = new Set(domains).size;
  const avgCredibility = sources.reduce((sum, s) => sum + (s.credibilityScore || 50), 0) / sources.length;
  
  const sourceAnalysis = `
[SOURCE_DIVERSITY] - Analysis of source variety and reliability
- Total sources analyzed: ${sources.length}
- Unique domains: ${uniqueDomains}
- Average credibility score: ${Math.round(avgCredibility)}%
- Source types: ${sources.map(s => s.sourceType).join(', ')}
- Geographic diversity: ${sources.map(s => s.country || 'Unknown').join(', ')}
- Temporal spread: ${sources.map(s => s.publishDate || 'Unknown').join(', ')}
`;

  return analysis + sourceAnalysis;
}

async function generateFactCheckQueries(claim: string): Promise<string[]> {
  const currentTime = new Date().toISOString();
  const prompt = QUERY_GENERATION_PROMPT.replace('{current_time}', currentTime) + 
    `\n\nClaim to fact-check: ${claim}`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/['"]/g, '') || '';
    
    // Generate multiple targeted queries for comprehensive coverage
    const baseQuery = generatedQuery || `${claim} fact check`;
    const queries = [
      baseQuery,
      `${claim} site:snopes.com OR site:factcheck.org OR site:politifact.com`,
      `${claim} official statement OR government data`,
      `${claim} research study OR academic paper`,
      `${claim} expert opinion OR analysis`,
      `${claim} latest news OR recent update`,
      `${claim} debunked OR refuted OR false`,
      `${claim} verified OR confirmed OR true`
    ];
    
    return [...new Set(queries)]; // Remove duplicates
  } catch (error) {
    console.error('Error generating fact-check queries:', error);
    return [
      `${claim} fact check site:snopes.com OR site:factcheck.org OR site:politifact.com`,
      `${claim} official statement`,
      `${claim} research study`
    ];
  }
}

// Legacy function for backward compatibility - now using generateFactCheckQueries
// async function generateFactCheckQuery(claim: string): Promise<string> {
//   const queries = await generateFactCheckQueries(claim);
//   return queries[0]; // Return primary query for backward compatibility
// }

async function searchWeb(query: string, maxResults: number = 5): Promise<{ results: Array<{ title: string; url: string; content: string; published_date?: string; score?: number }> }> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error performing search:', error);
    return { results: [] };
  }
}

async function searchWebParallel(queries: string[], maxResultsPerQuery: number = 3): Promise<{ results: Array<{ title: string; url: string; content: string; published_date?: string; score?: number }> }> {
  try {
    // Execute all searches in parallel for faster results
    const searchPromises = queries.map(query => 
      searchWeb(query, maxResultsPerQuery).catch(error => {
        console.error(`Search failed for query "${query}":`, error);
        return { results: [] };
      })
    );

    const searchResults = await Promise.all(searchPromises);
    
    // Combine and deduplicate results
    const allResults = searchResults.flatMap(result => result.results || []);
    const uniqueResults = allResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    // Sort by relevance score if available
    uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    return { results: uniqueResults };
  } catch (error) {
    console.error('Error in parallel search:', error);
    return { results: [] };
  }
}

async function analyzeEvidence(claim: string, searchResults: { results: Array<{ title: string; url: string; content: string; published_date?: string; score?: number }> }): Promise<string> {
  const formattedResults = [];
  for (let i = 0; i < Math.min(searchResults.results?.length || 0, 7); i++) {
    const result = searchResults.results[i];
    formattedResults.push(
      `Source ${i + 1}: ${result.title || 'No title'}\n` +
      `URL: ${result.url || 'No URL'}\n` +
      `Domain: ${new URL(result.url || 'https://example.com').hostname}\n` +
      `Content: ${result.content || 'No content'}\n`
    );
  }

  const prompt = ENHANCED_FACT_CHECK_PROMPT
    .replace('{claim}', claim)
    .replace('{search_results}', formattedResults.join('\n'));

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error generating fact-check analysis';
  } catch (error) {
    console.error('Error generating fact-check analysis:', error);
    return `Error generating fact-check analysis: ${error}`;
  }
}

// Removed unused function

function extractEnhancedSources(searchResults: { results: Array<{ title: string; url: string; content: string; published_date?: string; score?: number }> }): EnhancedSource[] {
  const sources = [];
  for (const result of searchResults.results?.slice(0, 10) || []) {
    const url = result.url || 'No URL';
    const domain = getDomainFromUrl(url);
    const sourceType = determineSourceType(domain);
    const credibilityScore = calculateCredibilityScore(domain, sourceType, result.title, result.content);
    
    // Calculate relevance score based on content quality and search score
    let relevanceScore = 60; // Base relevance
    if (result.score) {
      relevanceScore = Math.min(95, Math.max(60, result.score * 100));
    }
    
    // Boost relevance for high-quality content indicators
    if (result.content) {
      const qualityIndicators = ['according to', 'study shows', 'research indicates', 'data reveals', 'statistics show', 'official report'];
      const hasQualityIndicators = qualityIndicators.some(indicator => 
        result.content.toLowerCase().includes(indicator)
      );
      if (hasQualityIndicators) {
        relevanceScore += 10;
      }
      
      // Boost for recent content
      if (result.published_date) {
        const publishDate = new Date(result.published_date);
        const daysSincePublish = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublish < 30) {
          relevanceScore += 5;
        } else if (daysSincePublish < 365) {
          relevanceScore += 2;
        }
      }
    }
    
    sources.push({
      title: result.title || 'No title',
      url,
      domain,
      credibilityScore,
      sourceType,
      relevanceScore: Math.min(95, relevanceScore),
      excerpt: result.content ? result.content.substring(0, 200) + '...' : 'No content available',
      publishDate: result.published_date
    });
  }
  return sources.sort((a, b) => (b.credibilityScore + b.relevanceScore) - (a.credibilityScore + a.relevanceScore));
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

function determineSourceType(domain: string): EnhancedSource['sourceType'] {
  const govDomains = ['.gov', '.edu', '.org'];
  const newsDomains = ['bbc.com', 'reuters.com', 'ap.org', 'cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com'];
  const factCheckDomains = ['snopes.com', 'factcheck.org', 'politifact.com', 'fullfact.org'];
  const academicDomains = ['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'jstor.org', 'nature.com', 'science.org'];
  
  if (factCheckDomains.some(d => domain.includes(d))) return 'fact-checker';
  if (govDomains.some(d => domain.includes(d))) return 'government';
  if (academicDomains.some(d => domain.includes(d))) return 'academic';
  if (newsDomains.some(d => domain.includes(d))) return 'news';
  return 'unknown';
}

function calculateCredibilityScore(domain: string, sourceType: EnhancedSource['sourceType'], title?: string, content?: string): number {
  const baseScores = {
    'government': 90,
    'academic': 85,
    'fact-checker': 88,
    'news': 75,
    'blog': 50,
    'unknown': 40
  };
  
  let score = baseScores[sourceType];
  
  // High-credibility domains with specific scoring
  const highCredibilityDomains = {
    'bbc.com': 95,
    'reuters.com': 95,
    'ap.org': 95,
    'snopes.com': 92,
    'factcheck.org': 92,
    'politifact.com': 92,
    'fullfact.org': 92,
    'whitehouse.gov': 98,
    'cdc.gov': 98,
    'nih.gov': 98,
    'who.int': 98,
    'nature.com': 94,
    'science.org': 94,
    'pubmed.ncbi.nlm.nih.gov': 96,
    'scholar.google.com': 88,
    'jstor.org': 90,
    'theconversation.com': 85,
    'brookings.edu': 88,
    'rand.org': 88,
    'pewresearch.org': 87
  };
  
  // Check for exact domain matches first
  for (const [credDomain, credScore] of Object.entries(highCredibilityDomains)) {
    if (domain.includes(credDomain)) {
      score = credScore;
      break;
    }
  }
  
  // Additional credibility factors
  if (title && content) {
    // Boost for official language indicators
    const officialIndicators = ['official', 'government', 'federal', 'state', 'department', 'bureau', 'institute', 'university', 'research'];
    const hasOfficialLanguage = officialIndicators.some(indicator => 
      title.toLowerCase().includes(indicator) || content.toLowerCase().includes(indicator)
    );
    if (hasOfficialLanguage && score < 90) {
      score += 5;
    }
    
    // Boost for academic indicators
    const academicIndicators = ['study', 'research', 'analysis', 'peer-reviewed', 'journal', 'university', 'institute'];
    const hasAcademicLanguage = academicIndicators.some(indicator => 
      title.toLowerCase().includes(indicator) || content.toLowerCase().includes(indicator)
    );
    if (hasAcademicLanguage && sourceType === 'academic') {
      score += 3;
    }
    
    // Penalty for sensational language
    const sensationalIndicators = ['shocking', 'amazing', 'incredible', 'unbelievable', 'you won\'t believe', 'clickbait'];
    const hasSensationalLanguage = sensationalIndicators.some(indicator => 
      title.toLowerCase().includes(indicator) || content.toLowerCase().includes(indicator)
    );
    if (hasSensationalLanguage) {
      score -= 10;
    }
  }
  
  // Domain-specific adjustments
  if (domain.includes('.edu')) {
    score = Math.max(score, 80); // Educational institutions get minimum 80
  }
  if (domain.includes('.gov')) {
    score = Math.max(score, 85); // Government sites get minimum 85
  }
  if (domain.includes('.org') && !domain.includes('factcheck') && !domain.includes('snopes')) {
    score = Math.min(score, 75); // General .org sites capped at 75 unless fact-checkers
  }
  
  return Math.max(10, Math.min(100, score));
}

function parseAnalysis(analysis: string) {
  const sections = {
    verdict: extractSection(analysis, 'VERDICT'),
    explanation: extractSection(analysis, 'EXPLANATION'),
    claimExplanation: extractSection(analysis, 'CLAIM_EXPLANATION'),
    reasoningChain: extractSection(analysis, 'REASONING_CHAIN'),
    supportingEvidence: extractSection(analysis, 'SUPPORTING_EVIDENCE'),
    contradictingEvidence: extractSection(analysis, 'CONTRADICTING_EVIDENCE'),
    neutralEvidence: extractSection(analysis, 'NEUTRAL_EVIDENCE'),
    keyFactors: extractSection(analysis, 'KEY_FACTORS'),
    methodology: extractSection(analysis, 'METHODOLOGY'),
    limitations: extractSection(analysis, 'LIMITATIONS'),
    contextualNotes: extractSection(analysis, 'CONTEXTUAL_NOTES'),
    relatedClaims: extractSection(analysis, 'RELATED_CLAIMS')?.split('\n')
      .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.includes('[') && !line.includes(']')) || [],
    sourcesAnalysis: extractSection(analysis, 'SOURCES_ANALYSIS'),
    confidenceFactors: extractSection(analysis, 'CONFIDENCE_FACTORS')
  };
  
  return sections;
}

function extractSection(analysis: string, sectionName: string): string {
  const sectionStart = `[${sectionName}]`;
  
  // Define the order of sections for proper extraction
  const sectionOrder = [
    'VERDICT', 'EXPLANATION', 'CLAIM_EXPLANATION', 'REASONING_CHAIN',
    'SUPPORTING_EVIDENCE', 'CONTRADICTING_EVIDENCE', 'NEUTRAL_EVIDENCE',
    'KEY_FACTORS', 'METHODOLOGY', 'LIMITATIONS', 'CONTEXTUAL_NOTES',
    'RELATED_CLAIMS', 'SOURCES_ANALYSIS', 'CONFIDENCE_FACTORS'
  ];
  
  const currentIndex = sectionOrder.indexOf(sectionName);
  const nextSectionName = currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;
  
  const startIndex = analysis.indexOf(sectionStart);
  if (startIndex === -1) {
    return '';
  }
  
  let endIndex = -1;
  if (nextSectionName) {
    const nextSectionStart = `[${nextSectionName}]`;
    endIndex = analysis.indexOf(nextSectionStart, startIndex);
  }
  
  if (endIndex === -1) {
    // If no next section found, take until end of string
    return analysis.substring(startIndex + sectionStart.length).trim();
  }
  
  return analysis.substring(startIndex + sectionStart.length, endIndex).trim();
}

interface ParsedAnalysis {
  verdict: string;
  explanation: string;
  claimExplanation: string;
  reasoningChain: string;
  supportingEvidence: string;
  contradictingEvidence: string;
  neutralEvidence: string;
  keyFactors: string;
  methodology: string;
  limitations: string;
  contextualNotes: string;
  relatedClaims: string[];
  sourcesAnalysis: string;
  confidenceFactors: string;
}

function createEvidenceBreakdown(parsedAnalysis: ParsedAnalysis, sources: EnhancedSource[] = []): EvidenceBreakdown {
  const supporting = parsedAnalysis.supportingEvidence.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  const contradicting = parsedAnalysis.contradictingEvidence.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  const neutral = parsedAnalysis.neutralEvidence.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  // Enhanced evidence quality assessment with cross-verification
  const totalEvidence = supporting.length + contradicting.length + neutral.length;
  const evidenceDiversity = new Set([...supporting, ...contradicting, ...neutral]).size;
  
  // Check for evidence specificity and verifiability
  const evidenceSpecificity = [...supporting, ...contradicting, ...neutral].filter(evidence => 
    evidence.includes('according to') || 
    evidence.includes('reported by') || 
    evidence.includes('data shows') || 
    evidence.includes('statistics') ||
    evidence.includes('study') ||
    evidence.includes('research') ||
    evidence.includes('official') ||
    evidence.includes('government') ||
    evidence.includes('university') ||
    evidence.includes('journal')
  ).length;
  
  // Check for source diversity and credibility
  const sourceDiversity = new Set(sources.map(s => s.domain)).size;
  const avgSourceCredibility = sources.reduce((sum, s) => sum + s.credibilityScore, 0) / Math.max(sources.length, 1);
  const highCredibilitySources = sources.filter(s => s.credibilityScore >= 80).length;
  
  // Check for temporal diversity (recent vs older sources)
  const recentSources = sources.filter(s => {
    if (!s.publishDate) return false;
    const publishDate = new Date(s.publishDate);
    const daysSincePublish = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSincePublish < 365; // Within last year
  }).length;
  
  // Enhanced evidence quality calculation
  let evidenceQuality: "high" | "medium" | "low";
  
  const qualityScore = 
    (totalEvidence >= 6 ? 3 : totalEvidence >= 3 ? 2 : 1) + // Evidence quantity
    (evidenceDiversity >= 4 ? 3 : evidenceDiversity >= 2 ? 2 : 1) + // Evidence diversity
    (evidenceSpecificity >= 3 ? 3 : evidenceSpecificity >= 1 ? 2 : 1) + // Evidence specificity
    (sourceDiversity >= 4 ? 3 : sourceDiversity >= 2 ? 2 : 1) + // Source diversity
    (avgSourceCredibility >= 80 ? 3 : avgSourceCredibility >= 60 ? 2 : 1) + // Source credibility
    (highCredibilitySources >= 3 ? 2 : highCredibilitySources >= 1 ? 1 : 0) + // High-credibility sources
    (recentSources >= 2 ? 1 : 0); // Recent sources
  
  if (qualityScore >= 15) {
    evidenceQuality = 'high';
  } else if (qualityScore >= 10) {
    evidenceQuality = 'medium';
  } else {
    evidenceQuality = 'low';
  }
  
  return {
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    neutralEvidence: neutral,
    evidenceQuality
  };
}

function createReasoningBreakdown(parsedAnalysis: ParsedAnalysis): ReasoningBreakdown {
  const keyFactors = parsedAnalysis.keyFactors.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  const limitations = parsedAnalysis.limitations.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  const contextualNotes = parsedAnalysis.contextualNotes.split('\n')
    .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  // Parse reasoning chain steps
  const reasoningChain = parsedAnalysis.reasoningChain || '';
  const reasoningSteps = reasoningChain.split('\n')
    .filter((line: string) => line.trim().startsWith('Step') || line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*'))
    .map((line: string) => line.replace(/^(Step \d+:|-|•|\*)\s*/, '').trim())
    .filter((line: string) => line.length > 0 && !line.includes('[') && !line.includes(']'));
  
  return {
    keyFactors,
    methodology: cleanText(parsedAnalysis.methodology || 'Multi-source analysis with AI-powered evidence evaluation and systematic reasoning'),
    limitations,
    contextualNotes,
    reasoningChain: reasoningSteps,
    confidenceFactors: cleanText(parsedAnalysis.confidenceFactors || '')
  };
}

function determineVerdict(verdictText: string): "True" | "Mostly True" | "Mixed" | "Mostly False" | "False" | "Unverified" {
  const lower = verdictText.toLowerCase();
  
  // More comprehensive verdict detection
  if (lower.includes('mostly true') || lower.includes('largely true') || lower.includes('generally true')) return 'Mostly True';
  if (lower.includes('mostly false') || lower.includes('largely false') || lower.includes('generally false')) return 'Mostly False';
  if (lower.includes('mixed') || lower.includes('partially') || lower.includes('some truth')) return 'Mixed';
  
  // Check for clear true/false indicators
  const trueIndicators = ['true', 'correct', 'accurate', 'valid', 'confirmed', 'verified', 'supported'];
  const falseIndicators = ['false', 'incorrect', 'inaccurate', 'invalid', 'debunked', 'refuted', 'unsupported'];
  
  const hasTrueIndicators = trueIndicators.some(indicator => lower.includes(indicator));
  const hasFalseIndicators = falseIndicators.some(indicator => lower.includes(indicator));
  
  if (hasTrueIndicators && !hasFalseIndicators) return 'True';
  if (hasFalseIndicators && !hasTrueIndicators) return 'False';
  if (hasTrueIndicators && hasFalseIndicators) return 'Mixed';
  
  return 'Unverified';
}

function calculateConfidence(verdict: string, evidenceLength: number, sources: EnhancedSource[] = [], reasoningChain: string[] = []): number {
  let confidence = 0.5; // Base confidence
  
  // Evidence quantity factor
  if (evidenceLength > 10) confidence += 0.2;
  else if (evidenceLength > 5) confidence += 0.15;
  else if (evidenceLength > 2) confidence += 0.1;
  
  // Source quality factor
  const avgCredibility = sources.reduce((sum, source) => sum + (source.credibilityScore || 50), 0) / Math.max(sources.length, 1);
  if (avgCredibility > 80) confidence += 0.15;
  else if (avgCredibility > 60) confidence += 0.1;
  else if (avgCredibility > 40) confidence += 0.05;
  
  // Verdict clarity factor
  if (verdict === 'True' || verdict === 'False') confidence += 0.1;
  else if (verdict === 'Mostly True' || verdict === 'Mostly False') confidence += 0.05;
  else if (verdict === 'Mixed') confidence -= 0.05;
  else if (verdict === 'Unverified') confidence -= 0.1;
  
  // Reasoning chain quality factor
  if (reasoningChain.length > 4) confidence += 0.05;
  else if (reasoningChain.length > 2) confidence += 0.02;
  
  // Source diversity factor
  const uniqueDomains = new Set(sources.map(s => s.domain)).size;
  if (uniqueDomains > 5) confidence += 0.05;
  else if (uniqueDomains > 3) confidence += 0.03;
  else if (uniqueDomains > 1) confidence += 0.01;
  
  return Math.max(0.1, Math.min(0.95, confidence));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check environment variables
    if (!process.env.TAVILY_API_KEY || !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing required API keys (TAVILY_API_KEY, GEMINI_API_KEY)' },
        { status: 500 }
      );
    }

    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { claim } = body as EnhancedFactCheckRequest;

    if (!claim?.trim()) {
      return NextResponse.json(
        { error: 'Claim is required' },
        { status: 400 }
      );
    }

    const trimmedClaim = claim.trim();

    // Check cache first
    const cachedResult = getCachedResult(trimmedClaim);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Step 1: Generate multiple optimized search queries
    console.log('Generating optimized search queries...');
    const searchQueries = await generateFactCheckQueries(trimmedClaim);
    console.log(`Generated ${searchQueries.length} queries:`, searchQueries);

    // Step 2: Search for evidence with parallel queries for comprehensive coverage
    console.log('Searching for evidence with parallel queries...');
    const searchResults = await searchWebParallel(searchQueries, 3); // 3 results per query for better coverage

    if (!searchResults.results?.length) {
      return NextResponse.json(
        { error: 'No results found. The claim may be too new or too obscure.' },
        { status: 404 }
      );
    }

    // Step 3: Analyze evidence
    console.log('Analyzing evidence...');
    const factCheckAnalysis = await analyzeEvidence(trimmedClaim, searchResults);

    // Step 4: Format results
    const sources = extractEnhancedSources(searchResults);
    
    // Step 5: Enhance analysis with source context
    console.log('Enhancing analysis with source context...');
    const enhancedAnalysis = await enhanceAnalysisWithContext(factCheckAnalysis, sources);
    const parsedAnalysis = parseAnalysis(enhancedAnalysis);
    
    const verdict = determineVerdict(parsedAnalysis.verdict);
    const evidence = createEvidenceBreakdown(parsedAnalysis, sources);
    const reasoning = createReasoningBreakdown(parsedAnalysis);
    
    // Calculate enhanced confidence with all factors
    const evidenceLength = evidence.supportingEvidence.length + evidence.contradictingEvidence.length + evidence.neutralEvidence.length;
    const confidence = calculateConfidence(verdict, evidenceLength, sources, reasoning.reasoningChain || []);
    const processingTimeMs = Date.now() - startTime;
    
    const relatedClaims = parsedAnalysis.relatedClaims || [];
    
    const result: EnhancedFactCheckResult = {
      claim: {
        text: trimmedClaim,
        category: 'general',
        explanation: cleanText(parsedAnalysis.claimExplanation || '')
      },
      verdict,
      explanation: cleanText(parsedAnalysis.explanation || 'Analysis completed'),
      confidence,
      evidence,
      reasoning,
      sources,
      relatedClaims,
      processingTimeMs
    };

    // Cache the result for future requests
    setCachedResult(trimmedClaim, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Enhanced fact check API error:', error);
    
    const processingTimeMs = Date.now() - startTime;
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: error.message,
          processingTimeMs 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        processingTimeMs 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Enhanced Fact Check API is running' },
    { status: 200 }
  );
}
