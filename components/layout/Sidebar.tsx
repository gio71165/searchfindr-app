'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useReminderCount } from '@/lib/hooks/useReminderCount';
import { BarChart3, Clock, FileText, DollarSign, FolderOpen, Users, Globe } from 'lucide-react';

const FEATURE_FLAGS = {
  DOCUMENTS: false,
};

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { isCoalitionMember } = useAuth();
  const { count: reminderCount } = useReminderCount();

  const navItems = [
    {
      section: 'WORKFLOW',
      items: [
        { icon: Clock, label: 'Today', href: '/today', badge: reminderCount },
        { icon: BarChart3, label: 'Dashboard', href: '/dashboard' }
      ]
    },
    {
      section: 'DEAL SOURCES',
      items: [
        { icon: Globe, label: 'On-Market', href: '/on-market' },
        { icon: FileText, label: 'CIMs', href: '/cims' },
        { icon: DollarSign, label: 'Financials', href: '/financials' },
        ...(FEATURE_FLAGS.DOCUMENTS ? [{ icon: FolderOpen, label: 'Documents', href: '/documents' }] : [])
      ]
    },
    {
      section: 'RELATIONSHIPS',
      items: [
        { icon: Users, label: 'Brokers', href: '/brokers' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 min-h-[44px] min-w-[44px] bg-slate-950 border border-slate-800 rounded-lg shadow-md touch-manipulation flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 text-slate-300"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Premium Dark Theme */}
      <aside
        className={`
          w-64 bg-slate-950 border-r border-slate-800 h-screen flex flex-col z-30
          fixed lg:sticky top-0 left-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              SearchFindr
            </h1>
            {isCoalitionMember && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Coalition
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Deal Intelligence</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navItems.map((group, idx) => (
            <div key={idx}>
              {/* Section Header */}
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                {group.section}
              </div>

              {/* Nav Items */}
              <nav className="space-y-1">
                {group.items.map(item => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const IconComponent = item.icon;
                  const badgeCount = (item as any).badge || (item.href === '/today' ? reminderCount : 0);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200 min-h-[44px] touch-manipulation
                        ${isActive 
                          ? 'bg-slate-900 text-white border-l-4 border-emerald-500 pl-2.5' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                        }
                      `}
                    >
                      <IconComponent className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold min-w-[20px] text-center">
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
