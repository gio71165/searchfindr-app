'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { ChevronDown, LogOut, Settings, User, Zap, Shield, LayoutDashboard } from 'lucide-react';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const email = user?.email ?? null;

  const isAdminPage = pathname?.startsWith('/admin');
  const isDashboardPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/cims') || pathname?.startsWith('/financials') || pathname?.startsWith('/on-market') || pathname?.startsWith('/off-market') || pathname?.startsWith('/today') || pathname?.startsWith('/deals');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isAuthenticated = !authLoading && !!email;

  // Minimal nav when logged out: logo + "Need access?" only. No Connect Extension, no user dropdown.
  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="https://www.searchfindr.net/" className="text-xl font-bold text-slate-100 hover:text-indigo-300 transition-colors">
              SearchFindr
            </a>
            <a
              href={STRIPE_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-300 hover:text-indigo-300 transition-colors"
            >
              Need access?
            </a>
          </div>
        </div>
      </nav>
    );
  }

  // Full nav when authenticated
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors">
              SearchFindr
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/extension/callback', '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Extension</span>
              <span className="sm:hidden">Extension</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <span className="hidden sm:block">{email?.split('@')[0] || 'User'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="text-sm font-medium text-slate-900">{email}</p>
                    </div>
                    {isAdmin && isDashboardPage && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    {isAdminPage && (
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        User Dashboard
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
