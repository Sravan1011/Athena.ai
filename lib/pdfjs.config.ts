// This file configures PDF.js worker for the application

import * as pdfjs from 'pdfjs-dist';

// Configure the worker path
if (typeof window !== 'undefined') {
  // In the browser, set the worker source to the correct path
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export default pdfjs;
