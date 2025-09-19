import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

    // Process the PDF
    const result = await processPDF(file);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
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
      extractedAt: new Date().toISOString(),
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
      error: errorMessage,
      fileName: file.name,
      fileSize: file.size
    };
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'PDF Processing API is running' },
    { status: 200 }
  );
}
