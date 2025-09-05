'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-md w-full glass hover-lift border-white/20 bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-2xl">
        <div className="text-center">
          <Search className="h-20 w-20 text-blue-500 mx-auto mb-6 animate-float" />
          <h2 className="text-3xl font-bold gradient-text mb-4">Page Not Found</h2>
          <p className="text-slate-600 mb-8 text-lg">
            The page you are looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/">
            <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              Return Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
