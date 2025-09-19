"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser, SignOutButton } from "@clerk/nextjs"
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
  FileType2
} from "lucide-react"
import { cn, formatConfidence, getVerdictIcon, formatProcessingTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
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
  const [, setExtractedClaims] = useState<string[]>([])
  const [, setExtractingClaims] = useState(false)
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

  // Check file size (5MB limit)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Extract text from uploaded file
  // New function to process PDF and extract claims using the API
  const processPDFAndExtractClaims = useCallback(async (file: File) => {
    try {
      setExtractedText('Processing PDF and extracting claims...');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/pdf-claims', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'PDF processing failed');
      }
      
      // Update UI with results
      setExtractedText(result.pdf.extractedText);
      setExtractedClaims(result.claims.extracted);
      
      // Show success message
      setExtractedText(prev => prev + `\n\n✅ PDF processed successfully! Found ${result.claims.count} claims.`);
      
      return {
        text: result.pdf.extractedText,
        claims: result.claims.extracted,
        isImageBased: result.pdf.isImageBased,
        pageCount: result.pdf.pageCount
      };
      
    } catch (error) {
      console.error('PDF processing error:', error);
      throw error;
    }
  }, []);

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }

    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        // For PDF files
        const reader = new FileReader()
        
        reader.onload = async (e: ProgressEvent<FileReader>) => {
          const target = e.target as FileReader;
          if (!target || !target.result) {
            reject(new Error('File reading failed'));
            return;
          }

          try {
            // Dynamic import of PDF.js to avoid SSR issues
            const pdfjs = await import('pdfjs-dist');
            
            // Use the local worker from our API route
            pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';

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
            
            let text = ''
            let hasText = false
            
            for (let i = 1; i <= pdf.numPages; i++) {
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

              // Update progress in state if needed
              setExtractedText(`Extracting text... Page ${i} of ${pdf.numPages}`);
              
              // Add a small delay to prevent UI freeze
              await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            // If no text was extracted, the PDF might be image-based (scanned)
            if (!hasText || text.trim().length < 50) {
              console.log('PDF appears to be image-based or has minimal text. Attempting OCR...');
              setExtractedText('PDF appears to be scanned. OCR processing not available in this demo. Please use a text-based PDF.');
              resolve('This PDF appears to be scanned or image-based. For full OCR support, please use a text-based PDF or convert the document to text format.');
            } else {
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
              } else {
                reject(new Error(`PDF processing failed: ${error.message}`));
              }
            } else {
              reject(new Error('Failed to process PDF. The file may be corrupted or in an unsupported format.'));
            }
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        
        reader.readAsArrayBuffer(file)
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX files
        const reader = new FileReader()
        reader.onload = async (e: ProgressEvent<FileReader>) => {
          try {
            const target = e.target as FileReader;
            if (!target || !target.result) {
              reject(new Error('Failed to read file'));
              return;
            }
            // @ts-expect-error - docx types
            const { extractText } = await import('mammoth')
            const result = await extractText({ arrayBuffer: target.result })
            resolve(result.value)
          } catch (error) {
            console.error('Error extracting text from DOCX:', error)
            reject(error)
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        // For plain text files
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result?.toString() || '')
        reader.onerror = (error) => reject(error)
        reader.readAsText(file)
      }
    })
  }

  // Extract claims from text using Gemini
  const extractClaimsFromText = async (text: string): Promise<string[]> => {
    try {
      const response = await fetch('/api/extract-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      
      if (!response.ok) throw new Error('Failed to extract claims')
      const data = await response.json()
      return data.claims || []
    } catch (error) {
      console.error('Error extracting claims:', error)
      throw error
    }
  }

  // Handle file upload and processing
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    
    try {
      if (file.type === 'application/pdf') {
        // Use the new PDF processing pipeline
        setExtractedText('Processing PDF and extracting claims...');
        const result = await processPDFAndExtractClaims(file);
        
        // The claims are already extracted and set in the function
        setExtractedText(result.text);
        setExtractedClaims(result.claims);
        setExtractingClaims(false);
        
        // If we have claims, we can optionally fact-check the first one
        if (result.claims.length > 0) {
          setCurrentInput(result.claims[0]);
          // Don't auto-submit, let user choose which claim to fact-check
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
      setError('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
    setSelectedFile(file);
    setExtractedText('Processing document...');
    setError(null);

    try {
      // 1. Extract text from the file
      const text = await extractTextFromFile(file);
      
      // 2. Extract claims from the text
      setExtractedText('Extracting claims...')
      const claims = await extractClaimsFromText(text)
      
      if (claims.length === 0) {
        setError('No claims found in the document')
        return
      }

      // 3. Process each claim through fact-checking
      setExtractedText(`Found ${claims.length} claims. Fact-checking...`)
      
      for (const claim of claims) {
        await handleFactCheck({ claim })
        // Small delay between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      setExtractedText('')
    } catch (error) {
      console.error('Error processing file:', error)
      setError(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
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
  const handleFactCheck = useCallback(async (data: { claim: string }) => {
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
  }, [isSignedIn, currentConversationId])

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
  const saveMessage = async (conversationId: number, role: 'user' | 'assistant', content: string, metadata?: Record<string, unknown>) => {
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
    <div className="min-h-screen bg-background flex">
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
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-xs font-bold">C</span>
                </div>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">ClaimAI</span>
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
              className="w-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5 h-8 text-xs rounded-md transition-all duration-200"
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
      <div className="flex-1 flex flex-col h-screen">
        {/* Header with Logo */}
        <header className="bg-background border-b border-border px-6 py-4 flex-shrink-0">
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
                <h1 className="text-xl font-bold text-foreground tracking-tight">ClaimAI</h1>
                <p className="text-sm text-muted-foreground">AI-Powered Fact Checking</p>
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
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-3">
                Fact Check Any Claim
              </h1>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                Ask questions, verify claims, or analyze statements. I&apos;ll help you separate fact from fiction using AI-powered analysis.
              </p>
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
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-foreground text-xs font-medium">U</span>
                    </div>
                    <div className="flex-1">
                      <div 
                        className="text-foreground text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                      <p className="text-muted-foreground text-xs mt-1">{message.timestamp.toLocaleTimeString()}</p>
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
                      <div 
                        className="text-foreground text-sm mb-2"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                      {message.result && (
                        <div className="perplexity-chat p-4 mt-3">
                          <FactCheckResult result={message.result} />
                        </div>
                      )}
                      <p className="text-muted-foreground text-xs mt-2">{message.timestamp.toLocaleTimeString()}</p>
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
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-foreground text-sm">Analyzing claim...</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 bg-muted rounded animate-pulse"></div>
                      <div className="h-1.5 bg-muted rounded animate-pulse w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-t border-border bg-background">
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
                    placeholder="Ask anything or fact-check a claim..."
                    className="perplexity-search w-full px-4 py-3 pr-20 resize-none text-sm placeholder:text-muted-foreground-foreground focus:outline-none min-h-[44px] max-h-32"
                    disabled={isLoading || isUploading}
                    rows={1}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    disabled={isLoading || isUploading}
                  />
                </div>
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 w-7 p-0 bg-muted hover:bg-muted-hover rounded-md border border-border flex items-center justify-center transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"
                      disabled={isLoading || isUploading}
                      title="Upload document"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Upload PDF/DOCX
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-7 w-7 p-0 bg-muted hover:bg-muted-hover rounded-md border border-border flex items-center justify-center transition-colors"
                    disabled={isLoading || isUploading}
                    title="Keyboard shortcut: Cmd+Enter"
                  >
                    <span className="text-xs text-muted-foreground font-mono">⌘</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentInput.trim() && !isLoading) {
                        onSubmit({ claim: currentInput })
                      }
                    }}
                    disabled={isLoading || isUploading || !currentInput.trim()}
                    className="bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 h-7 w-7 p-0 rounded-md flex items-center justify-center transition-all"
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