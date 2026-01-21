import Link from 'next/link';
import { Home, DollarSign } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Subtle background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-96 w-[44rem] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-8xl sm:text-9xl font-bold text-white/10 mb-4">404</h1>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-xl text-white/60 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-base font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105"
          >
            <Home className="h-5 w-5" />
            Go to Homepage
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border-2 border-white/20 bg-white/5 text-base font-semibold text-white hover:bg-white/10 hover:border-white/30 transition-all"
          >
            <DollarSign className="h-5 w-5" />
            View Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
