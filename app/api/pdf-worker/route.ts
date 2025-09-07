import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Path to the PDF worker file in node_modules
    const workerPath = join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
    const workerContent = await readFile(workerPath);

    return new NextResponse(workerContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving PDF worker:', error);
    return new NextResponse('Error loading PDF worker', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// This tells Next.js to use the edge runtime
export const runtime = 'edge';
