import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse the request body
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Step 1: Process PDF and extract text
    console.log('Processing PDF...');
    const pdfResult = await processPDF(file);
    
    if (!pdfResult.success) {
      return NextResponse.json(
        { error: pdfResult.error },
        { status: 400 }
      );
    }

    // Step 2: Extract claims from the text
    console.log('Extracting claims...');
    const claimsResult = await extractClaims(pdfResult.text || '');
    
    if (!claimsResult.success) {
      return NextResponse.json(
        { error: claimsResult.error },
        { status: 500 }
      );
    }

    // Step 3: Return comprehensive results
    return NextResponse.json({
      success: true,
      pdf: {
        fileName: pdfResult.fileName,
        fileSize: pdfResult.fileSize,
        pageCount: pdfResult.pageCount,
        isImageBased: pdfResult.isImageBased,
        extractedText: pdfResult.text,
        message: pdfResult.message
      },
      claims: {
        extracted: claimsResult.claims,
        count: claimsResult.claims.length,
        processingTime: claimsResult.processingTime
      },
      processing: {
        totalTime: Date.now() - Date.now(), // Will be calculated properly
        steps: ['PDF Processing', 'Text Extraction', 'Claim Extraction'],
        completedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('PDF claims processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF and extract claims' },
      { status: 500 }
    );
  }
}

async function processPDF(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Dynamic import of PDF.js
    const pdfjs = await import('pdfjs-dist');
    
    // Configure worker
    pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker';
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
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
    
    let extractedText = '';
    let hasText = false;
    const pageCount = pdf.numPages;
    
    // Extract text from each page
    for (let i = 1; i <= pageCount; i++) {
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
        extractedText += pageText + '\n\n';
      }
    }
    
    // Check if PDF is image-based (scanned)
    const isImageBased = !hasText || extractedText.trim().length < 50;
    
    return {
      success: true,
      text: extractedText.trim(),
      pageCount,
      isImageBased,
      fileName: file.name,
      fileSize: file.size,
      message: isImageBased 
        ? 'PDF appears to be scanned or image-based. For full OCR support, please use a text-based PDF.'
        : 'PDF processed successfully'
    };
    
  } catch (error) {
    console.error('PDF processing error:', error);
    
    let errorMessage = 'Failed to process PDF';
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'Invalid PDF file. Please ensure the file is a valid PDF document.';
      } else if (error.message.includes('password')) {
        errorMessage = 'PDF is password protected. Please provide an unprotected PDF.';
      } else if (error.message.includes('worker')) {
        errorMessage = 'PDF processing worker failed to load. Please try again.';
      } else {
        errorMessage = `PDF processing failed: ${error.message}`;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

async function extractClaims(text: string) {
  const startTime = Date.now();
  
  try {
    if (!text || text.trim().length < 10) {
      return {
        success: false,
        error: 'No text content to analyze',
        claims: [],
        processingTime: 0
      };
    }

    // Truncate text if it's too long (Gemini has token limits)
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) + '...' : text;

    // Get the Gemini Pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Create a prompt to extract factual claims
    const prompt = `
    Analyze the following text and extract all factual claims or statements that can be fact-checked. 
    Focus on claims that make assertions about facts, statistics, events, or statements that can be verified as true or false.
    
    Format your response as a JSON array of strings, where each string is a clear, standalone claim.
    
    Example output:
    [
      "The Earth is flat",
      "Vaccines cause autism",
      "The Great Wall of China is the only man-made structure visible from space"
    ]
    
    Text to analyze:
    ${truncatedText}
    `;

    // Generate content with error handling for the API response
    let claimsText = '';
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      claimsText = response.text().trim();
      
      // If the response is empty, return an empty array
      if (!claimsText) {
        return {
          success: true,
          claims: [],
          processingTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('Error generating content with Gemini:', error);
      return {
        success: false,
        error: 'Failed to generate content with the AI model',
        claims: [],
        processingTime: Date.now() - startTime
      };
    }

    // Parse the response (it should be a JSON array of strings)
    let claims: string[] = [];
    try {
      // First, try to parse the entire response as JSON
      try {
        const parsed = JSON.parse(claimsText);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          claims = parsed;
        }
      } catch {
        // If direct JSON parse fails, try to extract JSON array from the response
        const jsonMatch = claimsText.match(/\[([\s\S]*?)\]/);
        if (jsonMatch) {
          const potentialJson = jsonMatch[0];
          try {
            const parsed = JSON.parse(potentialJson);
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
              claims = parsed;
            }
          } catch {
            console.log('Failed to parse JSON array from response');
          }
        }
      }
      
      // If we still don't have claims, try to extract them from text format
      if (claims.length === 0) {
        const claimLines = claimsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.match(/^\d+\.\s*[A-Z]/) || line.match(/^-\s*[A-Z]/) || line.match(/^•\s*[A-Z]/));
        
        claims = claimLines.map(line => 
          line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim()
        );
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return {
        success: false,
        error: 'Failed to parse claims from the AI response',
        claims: [],
        processingTime: Date.now() - startTime
      };
    }

    // Filter out any empty or invalid claims
    const validClaims = claims
      .map(claim => claim.trim())
      .filter(claim => claim.length > 10 && claim.length < 500); // Reasonable length limits

    return {
      success: true,
      claims: validClaims,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('Error extracting claims:', error);
    return {
      success: false,
      error: 'Failed to extract claims from the text',
      claims: [],
      processingTime: Date.now() - startTime
    };
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'PDF Claims API is running' },
    { status: 200 }
  );
}
