'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-md w-full glass hover-lift border-white/20 bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-2xl">
        <div className="text-center">
          <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-6 animate-bounce-subtle" />
          <h2 className="text-3xl font-bold gradient-text mb-4">Something went wrong</h2>
          <p className="text-slate-600 mb-8 text-lg">
            {error.message || 'An unexpected error occurred. Please try again later.'}
          </p>
          <button
            onClick={reset}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
