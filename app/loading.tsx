'use client';

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="relative mb-8">
          <Loader2 className="h-20 w-20 animate-spin text-blue-600 mx-auto" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
        </div>
        <h3 className="text-2xl font-bold gradient-text mb-4">Loading</h3>
        <p className="text-slate-600 text-lg">Please wait while we prepare your content...</p>
        <div className="flex justify-center space-x-1 mt-6">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  );
}
