'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    {
      section: 'OVERVIEW',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/dashboard' }
      ]
    },
    {
      section: 'SOURCES',
      items: [
        { icon: '🏪', label: 'On-Market', href: '/on-market' },
        { icon: '🔍', label: 'Off-Market', href: '/off-market' },
        { icon: '📄', label: 'CIMs', href: '/cims' },
        { icon: '💰', label: 'Financials', href: '/financials' }
      ]
    },
    {
      section: 'PIPELINE',
      items: [
        { icon: '🎯', label: 'Today', href: '/today' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 min-h-[44px] min-w-[44px] bg-white border border-gray-200 rounded-lg shadow-md touch-manipulation flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 text-gray-600"
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

      {/* Sidebar */}
      <aside
        className={`
          w-64 bg-white border-r border-gray-200 h-screen flex flex-col z-30
          fixed lg:sticky top-0 left-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
      <div className="flex-1 overflow-y-auto py-6">
        {navItems.map((group, idx) => (
          <div key={idx} className="mb-6">
            {/* Section Header */}
            <div className="px-6 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group.section}
              </h3>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
              {group.items.map(item => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-6 py-3 min-h-[44px] text-sm font-medium transition-colors touch-manipulation
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Settings at bottom */}
      <div className="border-t border-gray-200 p-4">
        <Link
          href="/settings"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-3 px-2 py-3 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
        >
          <span className="text-lg flex-shrink-0">⚙️</span>
          <span>Settings</span>
        </Link>
      </div>
    </aside>
    </>
  );
}
