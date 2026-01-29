'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';

const STRIPE_PAYMENT_URL = 'https://buy.stripe.com/dRm4gz1ReaTxct01lKawo00';
const CALENDLY_URL = 'https://calendly.com/gio-searchfindr/15min';

export function MarketingNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/#features', label: 'Features', scroll: true },
    { href: '/blog', label: 'Blog' },
    { href: '/tools', label: 'Tools' },
    { href: '/mission', label: 'About' },
    { href: '/help', label: 'Help' },
  ];

  const handleLinkClick = (e: React.MouseEvent, href: string, scroll: boolean) => {
    if (scroll && href.startsWith('/#')) {
      e.preventDefault();
      setIsMobileMenuOpen(false);
      if (pathname === '/') {
        // On homepage, scroll to section
        const id = href.slice(2);
        const element = document.getElementById(id);
        if (element) {
          // Add offset for fixed navbar
          const offset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - offset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      } else {
        // On other pages, navigate to homepage with hash
        window.location.href = href;
      }
      return;
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0a0e14]/80 backdrop-blur-md border-b border-white/10'
          : 'bg-[#0a0e14]/95 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl lg:text-2xl font-bold text-white hover:text-emerald-400 transition-colors tracking-tight"
          >
            SEARCHFINDR
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              link.scroll ? (
                <button
                  key={link.href}
                  onClick={(e) => handleLinkClick(e, link.href, true)}
                  className={`text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-emerald-400'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-emerald-400'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all text-sm"
            >
              Pricing
            </Link>
            <Link
              href="/demo"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-semibold text-white hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              Book Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden pb-6 border-t border-white/10 mt-4 pt-4 ${
            isScrolled 
              ? '' 
              : 'bg-[#0a0e14]/95 backdrop-blur-md'
          }`}>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.scroll ? (
                  <button
                    key={link.href}
                    onClick={(e) => handleLinkClick(e, link.href, true)}
                    className={`text-left text-sm font-medium transition-colors py-2 ${
                      pathname === link.href
                        ? 'text-emerald-400'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-left text-sm font-medium transition-colors py-2 ${
                      pathname === link.href
                        ? 'text-emerald-400'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors py-2"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white text-center hover:bg-emerald-500 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/demo"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-semibold text-white text-center hover:from-emerald-400 hover:to-emerald-500 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Book Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
