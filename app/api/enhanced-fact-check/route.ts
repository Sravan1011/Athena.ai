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

// Removed unused interface

// Enhanced system prompts with better reasoning and structure
const ENHANCED_FACT_CHECK_PROMPT = `You are an expert fact-checking assistant with advanced reasoning capabilities. Your task is to provide a comprehensive, well-reasoned analysis of the given claim using the search results.

CLAIM TO ANALYZE: {claim}

SEARCH RESULTS:
{search_results}

ANALYSIS FRAMEWORK:
Follow this structured reasoning process:

1. CLAIM DECONSTRUCTION
2. EVIDENCE EVALUATION  
3. SOURCE CREDIBILITY ASSESSMENT
4. REASONING CHAIN
5. VERDICT DETERMINATION
6. CONFIDENCE CALCULATION

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

ANALYSIS QUALITY STANDARDS:
- Be thorough and systematic in your reasoning
- Acknowledge uncertainty and limitations
- Provide specific evidence with sources when possible
- Use clear, objective language
- Consider multiple perspectives and interpretations
- Base conclusions on verifiable evidence, not speculation

IMPORTANT: Use precise, unambiguous language. Avoid hedging unless genuinely uncertain. Provide specific evidence and reasoning for your conclusions.`;

const QUERY_GENERATION_PROMPT = `You are an expert search query generator for comprehensive fact-checking analysis.

Current time: {current_time}

Your task: Create multiple targeted search queries to find comprehensive evidence for fact-checking the given claim.

ANALYSIS APPROACH:
1. Identify key entities, dates, and specific details
2. Consider different angles and perspectives
3. Target multiple source types for balanced analysis
4. Include both supporting and contradictory evidence searches

QUERY REQUIREMENTS:
- Include specific entities, names, dates, and details from the claim
- Use search-engine-optimized language (no special characters)
- Target authoritative sources: news, government, academic, fact-checking sites
- Design queries to find both supporting AND contradictory evidence
- Include temporal constraints for time-sensitive claims
- Consider different phrasings and synonyms

SEARCH STRATEGY:
1. Primary query: Direct fact-check of the specific claim
2. Context query: Background information and broader context
3. Source query: Official statements, reports, or data
4. Verification query: Cross-reference with fact-checking organizations

EXAMPLES:
- Policy: "Biden student loan forgiveness 2023 official announcement site:whitehouse.gov OR site:ed.gov"
- Statistics: "unemployment rate March 2024 Bureau Labor Statistics official data"
- Events: "Taylor Swift concert cancellation official statement site:reuters.com OR site:ap.org"
- Recent: "latest [topic] 2024 official announcement fact check"

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

async function generateFactCheckQuery(claim: string): Promise<string> {
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
    
    return generatedQuery || `${claim} fact check site:snopes.com OR site:factcheck.org OR site:politifact.com`;
  } catch (error) {
    console.error('Error generating fact-check query:', error);
    return `${claim} fact check site:snopes.com OR site:factcheck.org OR site:politifact.com`;
  }
}

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
  for (const result of searchResults.results?.slice(0, 7) || []) {
    const url = result.url || 'No URL';
    const domain = getDomainFromUrl(url);
    const sourceType = determineSourceType(domain);
    const credibilityScore = calculateCredibilityScore(domain, sourceType);
    
    sources.push({
      title: result.title || 'No title',
      url,
      domain,
      credibilityScore,
      sourceType,
      relevanceScore: Math.min(95, Math.max(60, Math.floor(Math.random() * 35) + 60)), // Simulated relevance
      excerpt: result.content ? result.content.substring(0, 200) + '...' : 'No content available'
    });
  }
  return sources.sort((a, b) => b.credibilityScore - a.credibilityScore);
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

function calculateCredibilityScore(domain: string, sourceType: EnhancedSource['sourceType']): number {
  const baseScores = {
    'government': 90,
    'academic': 85,
    'fact-checker': 88,
    'news': 75,
    'blog': 50,
    'unknown': 40
  };
  
  let score = baseScores[sourceType];
  
  // Boost for high-credibility domains
  const highCredibilityDomains = ['bbc.com', 'reuters.com', 'ap.org', 'snopes.com', 'factcheck.org', 'politifact.com'];
  if (highCredibilityDomains.some(d => domain.includes(d))) {
    score += 10;
  }
  
  return Math.min(100, score);
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

function createEvidenceBreakdown(parsedAnalysis: ParsedAnalysis): EvidenceBreakdown {
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
  
  // Enhanced evidence quality assessment
  const totalEvidence = supporting.length + contradicting.length + neutral.length;
  const evidenceDiversity = new Set([...supporting, ...contradicting, ...neutral]).size;
  const evidenceSpecificity = [...supporting, ...contradicting, ...neutral].filter(evidence => 
    evidence.includes('according to') || 
    evidence.includes('reported by') || 
    evidence.includes('data shows') || 
    evidence.includes('statistics') ||
    evidence.includes('study') ||
    evidence.includes('research')
  ).length;
  
  let evidenceQuality: "high" | "medium" | "low";
  if (totalEvidence >= 6 && evidenceDiversity >= 4 && evidenceSpecificity >= 2) {
    evidenceQuality = 'high';
  } else if (totalEvidence >= 3 && evidenceDiversity >= 2) {
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

    // Step 1: Generate optimized search query
    console.log('Generating optimized search query...');
    const searchQuery = await generateFactCheckQuery(trimmedClaim);
    console.log(`Generated query: ${searchQuery}`);

    // Step 2: Search for evidence with multiple queries for comprehensive coverage
    console.log('Searching for evidence...');
    const searchResults = await searchWeb(searchQuery, 10); // Increased results for better coverage

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
    const evidence = createEvidenceBreakdown(parsedAnalysis);
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
