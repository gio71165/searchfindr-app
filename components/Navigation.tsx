'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { ChevronDown, LogOut, Settings, User, Zap, Shield, LayoutDashboard, TrendingUp, HelpCircle, Mail } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, isAdmin, loading: authLoading, workspaceId, role: userRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const email = user?.email ?? null;

  const isAdminPage = pathname?.startsWith('/admin');
  const isInvestorPage = pathname?.startsWith('/investor');
  const isDashboardPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/cims') || pathname?.startsWith('/financials') || pathname?.startsWith('/on-market') || pathname?.startsWith('/off-market') || pathname?.startsWith('/today') || pathname?.startsWith('/deals');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Only consider authenticated if:
  // 1. Auth is done loading
  // 2. We have a valid session (not just cached user data)
  // 3. We have a user with email
  // 4. We have a workspaceId (profile loaded)
  // This prevents showing authenticated nav when there's stale/expired session data
  const isAuthenticated = !authLoading && !!session && !!user && !!email && !!workspaceId;

  // Minimal nav when logged out: logo + "Need access?" only. No Connect Extension, no user dropdown.
  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f17]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="https://www.searchfindr.net/" className="text-xl font-bold text-slate-100 hover:text-indigo-300 transition-colors">
              SearchFindr
            </a>
            <div className="flex items-center gap-4">
              <Link
                href="/blog"
                className="text-sm text-slate-300 hover:text-indigo-300 transition-colors"
              >
                Blog
              </Link>
              <Link
                href="/mission"
                className="text-sm text-slate-300 hover:text-indigo-300 transition-colors"
              >
                About
              </Link>
              <Link
                href="/help"
                className="text-sm text-slate-300 hover:text-indigo-300 transition-colors"
              >
                Help
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-500 transition-all text-sm"
              >
                From $99/mo
              </Link>
            </div>
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
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors min-h-[44px]"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Extension API Key</span>
              <span className="sm:hidden">API Key</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors min-h-[44px]"
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
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50 backdrop-blur-sm">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-slate-200">
                      <p className="text-sm font-medium text-slate-900">{email}</p>
                    </div>
                    {isAdmin && isDashboardPage && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    {userRole === 'investor' && (
                      <Link
                        href="/investor"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Investor Dashboard
                      </Link>
                    )}
                    {isAdminPage && (
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        User Dashboard
                      </Link>
                    )}
                    {isInvestorPage && (
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Searcher Dashboard
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      data-onboarding="settings-link"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Help & Support
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
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
