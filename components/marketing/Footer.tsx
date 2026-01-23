import Link from 'next/link';
import { Linkedin } from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/gio-searchfindr/15min';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#0a0e14]/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-white mb-2">SEARCHFINDR</h3>
            <p className="text-sm text-white/60 mb-4">
              AI-powered deal screening for search fund operators
            </p>
            <a
              href="https://www.linkedin.com/company/searchfindr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/60 hover:text-emerald-400 transition-colors"
            >
              <Linkedin className="h-5 w-5" />
              <span className="text-sm">LinkedIn</span>
            </a>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/#features"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <Link
                  href="/sample-output"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Sample Output
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/demo"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Book Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Help & Support
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Log In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50">
            © 2025 SearchFindr. All rights reserved.
          </p>
          <p className="text-sm text-white/50 italic">
            Built for searchers who move fast
          </p>
        </div>
      </div>
    </footer>
  );
}
