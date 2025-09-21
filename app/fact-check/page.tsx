"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser, useAuth, SignOutButton } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useSearchParams } from "next/navigation"
import {
  Loader2,
  ExternalLink,
  Sparkles,
  HomeIcon,
  FileText,
  Shield,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Minus,
  Clock,
  Send,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
  FileText as FileTextIcon,
  File,
  FileType2,
  MessageCircle
} from "lucide-react"
import { cn, formatConfidence, getVerdictIcon, formatProcessingTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Conversation, Message } from '@/lib/supabase'



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
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [, setResult] = useState<FactCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [extractedText, setExtractedText] = useState<string>('')
  const [pdfProcessingProgress, setPdfProcessingProgress] = useState<{
    current: number;
    total: number;
    currentClaim: string;
    isProcessing: boolean;
  }>({
    current: 0,
    total: 0,
    currentClaim: '',
    isProcessing: false
  })
  const [pdfProgressCollapsed, setPdfProgressCollapsed] = useState(false)
  const [chatInputCollapsed, setChatInputCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [autoFactCheck, setAutoFactCheck] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const safeUser = isSignedIn
    ? {
        firstName: user?.firstName || "",
        email: user?.emailAddresses?.[0]?.emailAddress || "",
      }
    : null

  const { setValue } = useForm<FactCheckForm>({
    resolver: zodResolver(factCheckSchema),
  })

  // Handle URL parameters for pre-filled claims
  useEffect(() => {
    const claimParam = searchParams.get('claim')
    if (claimParam) {
      const decodedClaim = decodeURIComponent(claimParam)
      setValue('claim', decodedClaim)
      setCurrentInput(decodedClaim)
      setAutoFactCheck(true)
    }
  }, [searchParams, setValue])


  // Enhanced client-side PDF processing with better error handling
  const processPDFAndExtractClaims = useCallback(async (file: File) => {
    const startTime = Date.now();
    
    try {
      // Check authentication
      if (!isSignedIn) {
        throw new Error('Please sign in to process PDFs and extract claims.');
      }
      
      setExtractedText('🔄 Initializing PDF processing...');
      
      // Validate file before processing
      if (!file || file.size === 0) {
        throw new Error('Invalid file provided');
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit. Please upload a smaller PDF.');
      }
      
      setExtractedText('📄 Loading PDF document...');
      
      // Step 1: Extract text from PDF on client-side
      const extractedText = await extractTextFromPDFClient(file);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('No readable text found in PDF. The document may be scanned or image-based. Please try a text-based PDF.');
      }
      
      const textLength = extractedText.length;
      setExtractedText(`✅ Text extracted successfully! Found ${textLength.toLocaleString()} characters. Analyzing content...`);
      
      // Add a small delay to show the success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExtractedText('🔍 Extracting verifiable claims from text...');
      
      // Step 2: Extract claims from the text using the updated API
      console.log('Making API call to /api/pdf-claims with text length:', extractedText.length);
      
      // Log client time for debugging JWT timing issues
      const clientTime = new Date();
      console.log('Client time:', clientTime.toISOString(), 'UTC offset:', clientTime.getTimezoneOffset());
      
      // Get authentication token with JWT timing fix
      let token = await getToken();
      
      // If token has timing issues, try to get a fresh one
      if (!token) {
        console.log('No token received, attempting to refresh...');
        // Wait a moment and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
        token = await getToken();
      }
      
      
      // Double-check authentication before making the API call
      if (!isSignedIn || !user) {
        throw new Error('Authentication lost. Please refresh the page and try again.');
      }
      
      const claimsResponse = await fetch('/api/pdf-claims', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ text: extractedText })
      });
      
      console.log('API response status:', claimsResponse.status);
      
      if (!claimsResponse.ok) {
        const errorData = await claimsResponse.json();
        console.log('API error response:', errorData);
        console.log('Response status:', claimsResponse.status);
        console.log('Response headers:', Object.fromEntries(claimsResponse.headers.entries()));
        
        // Handle authentication errors specifically
        if (claimsResponse.status === 401) {
          console.log('Authentication failed on server side');
          // If it's a JWT timing issue, the fallback should have worked
          if (errorData.debug?.clerkAuthReason === 'session-token-iat-in-the-future') {
            throw new Error('Authentication timing issue. Please try again in a moment.');
          }
          throw new Error('Authentication failed. Please refresh the page and try again.');
        }
        
        throw new Error(errorData.error || `Failed to extract claims from text (Status: ${claimsResponse.status})`);
      }
      
      const claimsData = await claimsResponse.json();
      const claims = claimsData.claims?.extracted || [];
      
      if (claims.length === 0) {
        throw new Error('No verifiable claims found in the PDF. The document may not contain factual statements suitable for fact-checking. Try uploading a document with more specific factual content.');
      }
      
      const processingTime = Date.now() - startTime;
      setExtractedText(`✅ PDF processing complete! Found ${claims.length} claims in ${(processingTime / 1000).toFixed(1)}s`);
      
      return {
        text: extractedText,
        claims: claims,
        isImageBased: false, // We successfully extracted text
        pageCount: Math.ceil(textLength / 2000), // Rough estimate based on text length
        processingTime: processingTime
      };
      
    } catch (error) {
      console.error('PDF processing error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Authentication required') || error.message.includes('sign in')) {
          throw new Error('Please sign in to process PDFs and extract claims.');
        } else if (error.message.includes('password')) {
          throw new Error('PDF is password protected. Please provide an unprotected PDF.');
        } else if (error.message.includes('Invalid PDF')) {
          throw new Error('Invalid PDF file. Please ensure the file is a valid PDF document.');
        } else if (error.message.includes('scanned') || error.message.includes('image-based')) {
          throw new Error('This PDF appears to be scanned or image-based. Please use a text-based PDF or convert the document to text format.');
        } else if (error.message.includes('size')) {
          throw new Error('File size exceeds the limit. Please upload a smaller PDF.');
        } else {
          throw new Error(`PDF processing failed: ${error.message}`);
        }
      } else {
        throw new Error('An unexpected error occurred while processing the PDF. Please try again.');
      }
    }
  }, [isSignedIn, getToken, user]);

  // Client-side PDF text extraction using PDF.js with enhanced progress tracking
  const extractTextFromPDFClient = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const target = e.target as FileReader;
        if (!target || !target.result) {
          reject(new Error('File reading failed'));
          return;
        }

        try {
          setExtractedText('🔧 Loading PDF processing engine...');
          
          // Dynamic import of PDF.js to avoid SSR issues
          const pdfjs = await import('pdfjs-dist');
          
          // Use the local worker from our API route
          pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';

          setExtractedText('📖 Parsing PDF document...');

          // Load the PDF document with better error handling
          const loadingTask = pdfjs.getDocument({
            data: target.result as ArrayBuffer,
            useSystemFonts: true,
            disableFontFace: false,
            disableRange: false,
            disableStream: false,
            disableAutoFetch: false,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`
          });
          
          const pdf = await loadingTask.promise;
          
          let text = '';
          let hasText = false;
          const pageCount = pdf.numPages;
          
          setExtractedText(`📄 Processing ${pageCount} page${pageCount > 1 ? 's' : ''}...`);
          
          // Extract text from each page with progress updates
          for (let i = 1; i <= pageCount; i++) {
            try {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              
              const strings = content.items
                .filter((item: unknown) => 
                  typeof item === 'object' && item !== null && 'str' in item && typeof (item as { str: unknown }).str === 'string'
                )
                .map((item: unknown) => (item as { str: string }).str);
              
              const pageText = strings.join(' ').trim();
              if (pageText) {
                hasText = true;
                text += pageText + '\n\n';
              }

              // Update progress with percentage
              const progress = Math.round((i / pageCount) * 100);
              setExtractedText(`📄 Extracting text... Page ${i} of ${pageCount} (${progress}%)`);
              
              // Add a small delay to prevent UI freeze and show progress
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (pageError) {
              console.warn(`Error processing page ${i}:`, pageError);
              // Continue with other pages even if one fails
            }
          }
          
          // If no text was extracted, the PDF might be image-based (scanned)
          if (!hasText || text.trim().length < 50) {
            reject(new Error('PDF appears to be scanned or image-based. For full OCR support, please use a text-based PDF.'));
          } else {
            setExtractedText(`✅ Text extraction complete! Found ${text.trim().length.toLocaleString()} characters.`);
            resolve(text.trim());
          }
        } catch (error) {
          console.error('Error extracting text from PDF:', error);
          
          // Provide more specific error messages
          if (error instanceof Error) {
            if (error.message.includes('Invalid PDF')) {
              reject(new Error('Invalid PDF file. Please ensure the file is a valid PDF document.'));
            } else if (error.message.includes('password')) {
              reject(new Error('PDF is password protected. Please provide an unprotected PDF.'));
            } else if (error.message.includes('worker')) {
              reject(new Error('PDF processing worker failed to load. Please try again.'));
            } else if (error.message.includes('scanned') || error.message.includes('image-based')) {
              reject(new Error('This PDF appears to be scanned or image-based. Please use a text-based PDF.'));
            } else {
              reject(new Error(`PDF processing failed: ${error.message}`));
            }
          } else {
            reject(new Error('Failed to process PDF. The file may be corrupted or in an unsupported format.'));
          }
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file. Please ensure the file is not corrupted.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };


  // Process all claims from PDF in the same conversation
  const processAllClaimsFromPDF = async (claims: string[], pdfText: string) => {
    if (!isSignedIn) {
      setError("Please sign in to use the fact checker")
      return
    }

    if (!claims || claims.length === 0) {
      setError('No claims found in the PDF')
      return
    }

    if (!pdfText || pdfText.trim().length === 0) {
      setError('No text content extracted from PDF')
      return
    }

    // Set up progress tracking
    setPdfProcessingProgress({
      current: 0,
      total: claims.length,
      currentClaim: '',
      isProcessing: true
    })
    
    // Reset collapsed state when starting new processing
    setPdfProgressCollapsed(false)
    
    // Show a brief notification that processing has started
    setTimeout(() => {
      if (pdfProcessingProgress.isProcessing) {
        // Add a small toast-like notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        notification.innerHTML = '📄 PDF processing started - Click to collapse progress panel';
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    }, 1000);

    // Create a single conversation for all PDF claims
    let conversationId = currentConversationId
    if (!conversationId) {
      conversationId = await createNewConversation(`PDF Analysis: ${selectedFile?.name || 'Document'} (${claims.length} claims)`)
      if (!conversationId) {
        throw new Error('Failed to create conversation')
      }
    }

    // Add PDF upload message to chat
    const pdfUploadMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: `📄 **PDF Uploaded**: ${selectedFile?.name}\n\n**Extracted Text Preview**:\n${pdfText.substring(0, 500)}${pdfText.length > 500 ? '...' : ''}\n\n**Found ${claims.length} claims to fact-check:**`,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, pdfUploadMessage])
    await saveMessage(conversationId, 'user', pdfUploadMessage.content)

    // Add assistant response about processing
    const processingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: `I've successfully processed your PDF and found ${claims.length} claims to analyze. I'll now fact-check each claim systematically in this conversation. Let me start the analysis...`,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, processingMessage])
    await saveMessage(conversationId, 'assistant', processingMessage.content)

    // Process each claim with progress updates
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i]
      
      // Skip empty or invalid claims
      if (!claim || claim.trim().length < 10) {
        console.warn(`Skipping invalid claim at index ${i}:`, claim);
        continue;
      }
      
      // Update progress
      setPdfProcessingProgress(prev => ({
        ...prev,
        current: i + 1,
        currentClaim: claim
      }))
      
      // Add progress message
      const progressMessage: ChatMessage = {
        id: (Date.now() + i * 2).toString(),
        type: 'assistant',
        content: `🔄 **Processing claim ${i + 1}/${claims.length}**\n\n**Claim**: "${claim}"`,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, progressMessage])
      await saveMessage(conversationId, 'assistant', progressMessage.content)

      try {
        // Fact-check the claim (skip user message since we already added it, force conversation ID)
        await handleFactCheck({ claim }, true, conversationId)
        successCount++;
        
        // Add a small delay between claims to avoid rate limiting
        if (i < claims.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`Error fact-checking claim ${i + 1}:`, error)
        errorCount++;
        
        // Add error message for this claim
        const errorMessage: ChatMessage = {
          id: (Date.now() + i * 2 + 1).toString(),
          type: 'assistant',
          content: `❌ **Error processing claim ${i + 1}**: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date()
        }

        setChatHistory(prev => [...prev, errorMessage])
        await saveMessage(conversationId, 'assistant', errorMessage.content)
      }
    }

    // Clear progress tracking
    setPdfProcessingProgress({
      current: 0,
      total: 0,
      currentClaim: '',
      isProcessing: false
    })

    // Add completion message with statistics
    const completionMessage: ChatMessage = {
      id: (Date.now() + claims.length * 2).toString(),
      type: 'assistant',
      content: `✅ **PDF Analysis Complete!**\n\n**Summary:**\n• Total claims processed: ${claims.length}\n• Successfully analyzed: ${successCount}\n• Errors encountered: ${errorCount}\n\nI've finished fact-checking all claims from your PDF. You can now review each analysis above. If you'd like to fact-check any specific claim again or have questions about the results, just let me know!`,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, completionMessage])
    await saveMessage(conversationId, 'assistant', completionMessage.content)
  }

  // Handle file upload and processing with enhanced error handling
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check authentication first with more detailed logging
    console.log('File upload - Authentication check:', { isSignedIn, user: !!user });
    if (!isSignedIn) {
      setError('Please sign in to upload and process files.');
      return;
    }

    // Validate file size (10MB limit for PDFs)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setIsUploading(true);
    setSelectedFile(file);
    setError(null);
    
    try {
      if (file.type === 'application/pdf') {
        // Use the enhanced PDF processing pipeline
        setExtractedText('🚀 Starting PDF analysis...');
        const result = await processPDFAndExtractClaims(file);
        
        // The claims are already extracted and set in the function
        setExtractedText(result.text);
        
        // Process all claims in the same conversation
        if (result.claims && result.claims.length > 0) {
          await processAllClaimsFromPDF(result.claims, result.text);
        } else {
          setError('No claims could be extracted from the PDF. The document may not contain verifiable factual statements suitable for fact-checking.');
        }
        
        setIsUploading(false);
        return;
      }
      
      // For other file types, use the original processing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to upload document';
        console.error('Upload error:', errorMessage);
        throw new Error(errorMessage);
      }

      if (!data.claim) {
        console.error('No claim generated from document');
        throw new Error('Could not extract a claim from the document');
      }

      const claim = data.claim.trim();
      setCurrentInput(claim);
      onSubmit({ claim });
      } catch (error) {
        console.error('Failed to upload document:', error);
        
        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes('password')) {
            setError('PDF is password protected. Please provide an unprotected PDF.');
          } else if (error.message.includes('scanned') || error.message.includes('image-based')) {
            setError('This PDF appears to be scanned or image-based. Please use a text-based PDF or convert the document to text format.');
          } else if (error.message.includes('size')) {
            setError('File size exceeds the limit. Please upload a smaller PDF.');
          } else if (error.message.includes('Invalid PDF')) {
            setError('Invalid PDF file. Please ensure the file is a valid PDF document.');
          } else {
            setError(`Upload failed: ${error.message}`);
          }
        } else {
          setError('An unexpected error occurred while processing the document. Please try again.');
        }
      } finally {
        setIsUploading(false);
      }
    }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF, DOCX, or text file')
      return
    }

    handleFileUpload(file);
  }

  // Handle fact-check function
  const handleFactCheck = useCallback(async (data: { claim: string }, skipUserMessage: boolean = false, forceConversationId?: number) => {
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
      let conversationId = forceConversationId || currentConversationId
      
      // Create new conversation if none exists (only if not forced)
      if (!conversationId) {
        conversationId = await createNewConversation(`Fact-check: ${claim.substring(0, 50)}...`)
        if (!conversationId) {
          throw new Error('Failed to create conversation')
        }
      }

      // Add user message to chat and save to DB (unless skipped for batch processing)
      if (!skipUserMessage) {
        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: claim,
          timestamp: new Date()
        }

        setChatHistory(prev => [...prev, userMessage])
        await saveMessage(conversationId, 'user', claim)
      }

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
          evidence: enhancedData.evidence,
          reasoning: enhancedData.reasoning,
          sources: enhancedData.sources,
          processingTimeMs: enhancedData.processingTimeMs,
          claim: { text: claim },
          contextualInfo: enhancedData.contextualInfo
        }

        setResult(factCheckResult)

        // Add assistant message with fact-check result
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `I've analyzed the claim: "${claim}"\n\n**Verdict:** ${factCheckResult.verdict}\n**Confidence:** ${Math.round((factCheckResult.confidence || 0) * 100)}%\n\n${factCheckResult.explanation}`,
          result: factCheckResult,
          timestamp: new Date()
        }

        setChatHistory(prev => [...prev, assistantMessage])
        await saveMessage(conversationId, 'assistant', assistantMessage.content, {
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
        body: JSON.stringify({ claim }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fact check. Please try again.")
      }

      const resultData: FactCheckResult = await response.json()

      if (!resultData.verdict || !resultData.explanation || !resultData.claim?.text) {
        throw new Error("Invalid response format from the server")
      }

      setResult(resultData)

      // Add assistant message with fact-check result
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I've analyzed the claim: "${claim}"\n\n**Verdict:** ${resultData.verdict}\n**Confidence:** ${Math.round((resultData.confidence || 0) * 100)}%\n\n${resultData.explanation}`,
        result: resultData,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, assistantMessage])
      await saveMessage(conversationId, 'assistant', assistantMessage.content, {
        fact_check_result: resultData,
        confidence_score: resultData.confidence
      })
    } catch (err) {
      console.error("Fact check error:", err)
      setError(err instanceof Error ? err.message : "An error occurred while fact-checking")
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, currentConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fact-check when claim is pre-filled from URL
  useEffect(() => {
    if (autoFactCheck && currentInput && !isLoading) {
      setAutoFactCheck(false)
      handleFactCheck({ claim: currentInput })
    }
  }, [autoFactCheck, currentInput, isLoading, handleFactCheck])

  // Load user's conversations
  const loadConversations = useCallback(async () => {
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
  }, [isSignedIn])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, isLoading])

  // Load conversations when user signs in
  useEffect(() => {
    if (isSignedIn) {
      loadConversations()
    }
  }, [isSignedIn, loadConversations])

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

  // Create new conversation
  const createNewConversation = async (title?: string) => {
    try {
      const token = await getToken()
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
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
  const saveMessage = async (conversationId: number, role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include',
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
      const token = await getToken()
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        credentials: 'include'
      })
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

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    <div className="min-h-screen aged-paper relative overflow-hidden flex">
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
      {/* Sidebar */}
      <div className={`vintage-paper-nav relative z-10 transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 overflow-visible relative group border-r border-[#d4af8c]`}>
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
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-6 h-16 rounded-r-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group animate-pulse hover:animate-none hover:scale-105"
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
          <div className="p-3 border-b border-[#d4af8c]">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-8 h-8 sherlock-gradient rounded-lg flex items-center justify-center shadow-lg border-2 border-[#654321]">
                  <Shield className="w-4 h-4 text-[#f8f5f0]" />
                </div>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <span className="text-lg font-bold bg-gradient-to-r from-[#654321] to-[#8b572a] bg-clip-text text-transparent font-serif whitespace-nowrap">Athena.ai</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="text-muted-foreground hover:text-foreground h-6 w-6 p-0"
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
              className="w-full vintage-paper-button text-[#654321] font-serif hover:opacity-90 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
              New Investigation
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'opacity-0 transform -translate-x-4' : 'opacity-100 transform translate-x-0'} overflow-hidden`}>
              {conversations.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2 py-1 text-muted-foreground">
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                  {conversations.slice(0, 10).map((conversation, index) => (
                    <div
                      key={conversation.id}
                      className={`group relative rounded-md hover:bg-muted/50 transition-all duration-200 ${
                        currentConversationId === conversation.id ? 'bg-muted border border-border' : ''
                      }`}
                      style={{ 
                        animation: !sidebarCollapsed ? `slideInLeft 0.3s ease-out forwards ${index * 50}ms` : 'none'
                      }}
                    >
                      <button
                        onClick={() => loadConversation(conversation.id)}
                        className="w-full text-left px-2 py-1.5 cursor-pointer"
                      >
                        <p className="text-xs text-foreground truncate pr-6">{conversation.title}</p>
                        <p className="text-xs text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground">Loading conversations...</div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'h-0 opacity-0 p-0' : 'h-auto opacity-100 p-3'} overflow-hidden border-t border-border space-y-3`}>
            <div className={`transition-all duration-600 ease-in-out delay-100 ${sidebarCollapsed ? 'transform translate-y-4 opacity-0' : 'transform translate-y-0 opacity-100'}`}>
              <ThemeSwitcher />
            </div>
            <div className={`transition-all duration-600 ease-in-out delay-200 ${sidebarCollapsed ? 'transform translate-y-4 opacity-0' : 'transform translate-y-0 opacity-100'} flex items-center justify-between`}>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-background">
                    {(safeUser?.firstName || safeUser?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-foreground truncate">
                  {safeUser?.firstName || safeUser?.email}
                </span>
              </div>
              <SignOutButton>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-6 w-6 p-0 flex-shrink-0 transition-all duration-200 hover:scale-110">
                  <Settings className="h-3 w-3" />
                </Button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen relative z-10">
        {/* Header with Vintage Styling */}
        <header className="vintage-paper-nav border-b border-[#d4af8c] px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 sherlock-gradient rounded-lg flex items-center justify-center shadow-lg border-2 border-[#654321]">
                <Shield className="w-8 h-8 text-[#f8f5f0]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#654321] to-[#8b572a] bg-clip-text text-transparent font-serif tracking-tight">Athena.ai</h1>
                <p className="text-sm text-[#8b572a] font-serif">AI-Powered Fact Checking</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button asChild className="vintage-paper-button text-[#654321] font-serif" size="sm">
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
              <div className="w-16 h-16 sherlock-gradient rounded-lg flex items-center justify-center mb-6 shadow-lg border-2 border-[#654321]">
                <Shield className="h-8 w-8 text-[#f8f5f0]" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#654321] to-[#8b572a] bg-clip-text text-transparent mb-4 font-serif">
                Investigate Any Claim
              </h1>
              <p className="text-[#8b572a] max-w-md text-lg leading-relaxed font-serif">
                Ask questions, verify claims, or analyze statements. I&apos;ll help you separate fact from fiction using AI-powered deduction.
              </p>
              
              {!isSignedIn && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <Shield className="h-4 w-4 inline mr-1" />
                    Sign in to upload PDFs and access full fact-checking features
                  </p>
                </div>
              )}
              
              {autoFactCheck && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auto-processing claim from RSS feed...</span>
                </div>
              )}
              
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
                    className="perplexity-message p-3 text-left hover:bg-muted-hover transition-colors text-xs"
                  >
                    <p className="text-foreground leading-relaxed">{example}</p>
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
                    <div className="w-8 h-8 sherlock-gradient rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg border-2 border-[#654321]">
                      <span className="text-[#f8f5f0] text-xs font-bold font-serif">You</span>
                    </div>
                    <div className="flex-1 vintage-paper-card p-4 rounded-lg">
                      <div 
                        className="text-[#654321] text-sm leading-relaxed font-serif"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                      <p className="text-[#8b572a] text-xs mt-2 font-serif">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}

                {/* Assistant Message */}
                {message.type === 'assistant' && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 sherlock-gradient rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg border-2 border-[#654321]">
                      <Shield className="h-4 w-4 text-[#f8f5f0]" />
                    </div>
                    <div className="flex-1 vintage-paper-card p-4 rounded-lg">
                      <div 
                        className="text-[#654321] text-sm mb-2 font-serif leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                      {message.result && (
                        <div className="vintage-paper-card p-4 mt-3 border-l-4 border-[#8b572a]">
                          <FactCheckResult result={message.result} />
                        </div>
                      )}
                      <p className="text-[#8b572a] text-xs mt-2 font-serif">Athena.ai • {message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 sherlock-gradient rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg border-2 border-[#654321]">
                  <Loader2 className="h-4 w-4 text-[#f8f5f0] animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="vintage-paper-card p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#8b572a] rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-[#8b572a] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-[#8b572a] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <span className="text-[#654321] text-sm font-serif">Athena.ai is investigating...</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-2 bg-[#8b572a]/20 rounded animate-pulse"></div>
                      <div className="h-2 bg-[#8b572a]/20 rounded animate-pulse w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Search Input - Collapsible */}
        <div className="border-t border-[#d4af8c] vintage-paper-nav relative z-10">
          {/* Collapse/Expand Button */}
          <div className="flex justify-center py-2">
            <button
              onClick={() => setChatInputCollapsed(!chatInputCollapsed)}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              {chatInputCollapsed ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Show Chat Input</span>
                  {currentInput.trim() && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                      {currentInput.length > 0 ? '1' : ''}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Hide Chat Input</span>
                </>
              )}
            </button>
          </div>
          
          {/* Collapsible Input Area */}
          {!chatInputCollapsed && (
            <div className="p-4">
              <div className="max-w-2xl mx-auto">
                <form onSubmit={(e) => e.preventDefault()} className="relative">
              <div className="relative flex items-end">
                <div className="flex-1 relative">
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
                    placeholder="Ask anything or investigate a claim..."
                    className="w-full px-4 py-3 pr-20 resize-none text-sm bg-[#f8f5f0] border border-[#d4af8c] rounded-lg text-[#654321] placeholder-[#8b572a] font-serif focus:outline-none focus:border-[#8b572a] focus:ring-2 focus:ring-[#8b572a]/20 min-h-[44px] max-h-32"
                    disabled={isLoading || isUploading}
                    rows={1}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    disabled={isLoading || isUploading || !isSignedIn}
                  />
                </div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 w-8 p-0 bg-[#f8f5f0] hover:bg-[#f4f1e8] rounded-lg border border-[#d4af8c] flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || isUploading || !isSignedIn}
                      title={!isSignedIn ? "Please sign in to upload documents" : "Upload document"}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#8b572a]" />
                      ) : (
                        <Upload className="h-4 w-4 text-[#8b572a]" />
                      )}
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 vintage-paper-card text-[#654321] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-serif shadow-lg">
                      Upload PDF/DOCX
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#f8f5f0]"></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-8 w-8 p-0 bg-[#d4af8c] hover:bg-[#c4a484] rounded-lg border-2 border-[#8b572a] flex items-center justify-center transition-colors shadow-md"
                    disabled={isLoading || isUploading}
                    title="Keyboard shortcut: Cmd+Enter"
                  >
                    <span className="text-xs text-[#654321] font-mono font-bold">⌘</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentInput.trim() && !isLoading) {
                        onSubmit({ claim: currentInput })
                      }
                    }}
                    disabled={isLoading || isUploading || !currentInput.trim()}
                    className="h-8 w-8 p-0 bg-[#8b572a] hover:bg-[#654321] text-[#f8f5f0] rounded-lg border border-[#d4af8c] flex items-center justify-center transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            
            {selectedFile && (
              <div className="mt-2 flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-border">
                <div className="flex items-center overflow-hidden">
                  <div className="flex-shrink-0 p-1.5 mr-2 rounded-md bg-blue-50 dark:bg-blue-900/30">
                    {selectedFile.name.endsWith('.pdf') ? (
                      <FileTextIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : selectedFile.name.endsWith('.docx') ? (
                      <FileType2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <File className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedFile(null)
                    setExtractedText('')
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    // Remove the document content from the input if it exists
                    if (currentInput.includes('Document content from')) {
                      setCurrentInput(currentInput.split('\nDocument content from')[0])
                    }
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title="Remove file"
                  disabled={isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            
            {isUploading && extractedText && (
              <div className="mt-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/50">
                <div className="flex items-center">
                  <Loader2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin mr-2" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">{extractedText}</p>
                </div>
                {!extractedText.includes('Fact-checking') && (
                  <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: extractedText.includes('Extracting text') ? '40%' : 
                               extractedText.includes('Extracting claims') ? '70%' : '100%'
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* Authentication Status */}
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Auth Status:</span>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${isSignedIn ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                    {isSignedIn ? '✅ Signed In' : '❌ Not Signed In'}
                  </span>
                  {user && (
                    <span className="text-muted-foreground">
                      {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Authentication Required Message */}
            {!isSignedIn && (
              <div className="mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/50">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Please sign in to upload and process PDFs for fact-checking.
                  </p>
                </div>
              </div>
            )}

            {/* PDF Processing Progress - Collapsible */}
            {pdfProcessingProgress.isProcessing && (
              <div className="mt-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/50">
                {/* Header - Always visible */}
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  onClick={() => setPdfProgressCollapsed(!pdfProgressCollapsed)}
                >
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Processing PDF Claims
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {pdfProcessingProgress.current} of {pdfProcessingProgress.total} claims processed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {Math.round((pdfProcessingProgress.current / pdfProcessingProgress.total) * 100)}%
                    </span>
                    <button className="p-1 hover:bg-green-200 dark:hover:bg-green-800/50 rounded">
                      {pdfProgressCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Collapsible Content */}
                {!pdfProgressCollapsed && (
                  <div className="px-3 pb-3 border-t border-green-200 dark:border-green-800/50">
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-3">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${(pdfProcessingProgress.current / pdfProcessingProgress.total) * 100}%`
                        }}
                      ></div>
                    </div>
                    
                    {/* Current claim being processed */}
                    {pdfProcessingProgress.currentClaim && (
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                          Currently processing:
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 bg-white dark:bg-gray-800 p-2 rounded border">
                          &ldquo;{pdfProcessingProgress.currentClaim}&rdquo;
                        </p>
                      </div>
                    )}
                    
                    {/* Processing status */}
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                      <p>✅ PDF text extracted successfully</p>
                      <p>🔍 Claims identified and being fact-checked</p>
                      <p>⏳ Processing in the same conversation thread</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
        
        {/* Floating Action Button when chat input is collapsed */}
        {chatInputCollapsed && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setChatInputCollapsed(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              title="Open chat input"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple markdown renderer for basic formatting
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
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

  return (
    <div className="space-y-4">
      {/* Main Result */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center space-x-2 shadow-sm",
              result.verdict === "True" ? "bg-green-100 text-green-800 border border-green-200" :
              result.verdict === "False" ? "bg-red-100 text-red-800 border border-red-200" :
              result.verdict === "Mostly True" ? "bg-green-50 text-green-700 border border-green-300" :
              result.verdict === "Mostly False" ? "bg-red-50 text-red-700 border border-red-300" :
              result.verdict === "Mixed" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
              "bg-gray-100 text-gray-700 border border-gray-200"
            )}
          >
            {getVerdictIcon(result.verdict, "h-4 w-4")}
            <span>{result.verdict}</span>
          </div>
          {result.confidence && (
            <div className="flex items-center space-x-1">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    result.confidence >= 0.8 ? "bg-green-500" :
                    result.confidence >= 0.6 ? "bg-yellow-500" :
                    "bg-red-500"
                  )}
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                {formatConfidence(result.confidence)}
              </span>
            </div>
          )}
        </div>
        {result.processingTimeMs && (
          <div className="flex items-center space-x-1 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatProcessingTime(result.processingTimeMs)}</span>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Analysis</h3>
          {result.evidence?.evidenceQuality && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground">Evidence Quality:</span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                result.evidence.evidenceQuality === 'high' ? "bg-green-100 text-green-700" :
                result.evidence.evidenceQuality === 'medium' ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {result.evidence.evidenceQuality.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-foreground leading-relaxed">{result.explanation}</p>
      </div>

      {/* Expandable Sections */}
      {result.sources && result.sources.length > 0 && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => toggleSection('sources')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="notion-h3-themed">Sources ({result.sources.length})</h3>
            {expandedSections.sources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedSections.sources && (
            <div className="mt-4 space-y-3">
              {result.sources.slice(0, 8).map((source, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2 flex-1">
                      {getSourceTypeIcon(source.sourceType)}
                      <h4 className="notion-body-themed font-medium flex-1">{source.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              source.credibilityScore >= 80 ? "bg-green-500" :
                              source.credibilityScore >= 60 ? "bg-yellow-500" :
                              "bg-red-500"
                            )}
                            style={{ width: `${source.credibilityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {source.credibilityScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="notion-body-sm-themed text-muted-foreground mb-3 leading-relaxed">{source.excerpt}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline notion-body-sm-themed flex items-center"
                      >
                        {source.domain}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                      {source.publishDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(source.publishDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        getCredibilityColor(source.credibilityScore)
                      )}>
                        {source.sourceType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}