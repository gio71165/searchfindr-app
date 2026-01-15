'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Sidebar() {
  const pathname = usePathname();

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
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
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
                    className={`
                      flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="text-lg">{item.icon}</span>
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
          className="flex items-center gap-3 px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="text-lg">⚙️</span>
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
