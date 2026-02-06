'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { ChevronDown, LogOut, Settings, User, Zap, Shield, LayoutDashboard, TrendingUp, HelpCircle, Mail, Plus, FileText, DollarSign, Building2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session, isAdmin, isCoalitionLeader, loading: authLoading, workspaceId, role: userRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNewDealMenu, setShowNewDealMenu] = useState(false);
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
                className="btn-primary"
              >
                From $79/mo
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Full nav when authenticated - Dark theme
  return (
    <nav className="sticky top-0 z-40 h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6">
      {/* Search / Command Palette - Placeholder for future */}
      <div className="flex-1 max-w-2xl hidden lg:block" />

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Extension API Key Button */}
        <Link
          href="/settings#api-keys"
          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors hidden sm:inline-flex"
        >
          🔑 Extension API Key
        </Link>
            {/* + New Deal Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNewDealMenu(!showNewDealMenu)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Deal</span>
                <span className="sm:hidden">New</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showNewDealMenu ? 'rotate-180' : ''}`} />
              </button>

              {showNewDealMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNewDealMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-800 shadow-xl z-50 backdrop-blur-sm">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowNewDealMenu(false);
                          router.push('/dashboard?upload=cim');
                          // Trigger CIM upload after navigation
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('trigger-cim-upload'));
                          }, 500);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px] text-left"
                      >
                        <FileText className="h-4 w-4 text-blue-400" />
                        <div>
                          <div className="font-medium">Upload CIM</div>
                          <div className="text-xs text-slate-500">PDF, DOCX, DOC</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowNewDealMenu(false);
                          router.push('/dashboard?upload=financials');
                          // Trigger Financials upload after navigation
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('trigger-financials-upload'));
                          }, 500);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px] text-left"
                      >
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                        <div>
                          <div className="font-medium">Upload Financials</div>
                          <div className="text-xs text-slate-500">PDF, CSV, Excel</div>
                        </div>
                      </button>
                      {/* On-Market and Off-Market can be added later if needed */}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-lg transition-colors min-h-[44px]"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                  <User className="h-4 w-4 text-slate-400" />
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
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-800 shadow-xl z-50 backdrop-blur-sm">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm font-medium text-slate-50">{email}</p>
                    </div>
                    {isAdmin && isDashboardPage && (
                      <Link
                        href="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    {userRole === 'investor' && (
                      <Link
                        href="/investor"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Investor Dashboard
                      </Link>
                    )}
                    {isCoalitionLeader && (isDashboardPage || pathname?.startsWith('/coalition')) && (
                      <Link
                        href="/coalition/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                      >
                        <Building2 className="h-4 w-4" />
                        Coalition Command Center
                      </Link>
                    )}
                    {isAdminPage && (
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        User Dashboard
                      </Link>
                    )}
                    {isInvestorPage && (
                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Searcher Dashboard
                      </Link>
                    )}
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      data-onboarding="settings-link"
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <Link
                      href="/help"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px]"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Help & Support
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition-colors min-h-[44px] text-left"
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
    </nav>
  );
}
