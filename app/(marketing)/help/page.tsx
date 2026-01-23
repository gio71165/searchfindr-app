import { HelpCircle, Mail, BookOpen, Zap, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const CONTACT_EMAIL = 'gio@searchfindr.net';

const faqs = [
  {
    question: 'How do I upload a CIM?',
    answer: 'Go to your Dashboard and click "Upload CIM" or drag and drop a PDF file. The AI will analyze it in about 60 seconds.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'CIMs: PDF, DOCX, DOC. Financials: PDF, CSV, XLSX, XLS.',
  },
  {
    question: 'How accurate is the AI analysis?',
    answer: 'Our AI provides confidence levels (A/B/C) for each analysis. A-tier analyses are highly reliable, while C-tier may need manual verification.',
  },
  {
    question: 'Can I export my deal analysis?',
    answer: 'Yes! Click the "Export PDF" button on any deal page to download a comprehensive analysis report.',
  },
  {
    question: 'How do I set up the browser extension?',
    answer: 'Click "Connect Extension" in the navigation bar, then follow the instructions to install and connect the extension.',
  },
  {
    question: 'What happens if I cancel my subscription?',
    answer: 'You can cancel anytime. Your access continues until the end of your billing period. No refunds for partial periods.',
  },
  {
    question: 'How do I change my deal stage?',
    answer: 'On any deal page, use the "Stage" dropdown in the Deal Workflow section. You can also use keyboard shortcuts (press E to edit).',
  },
  {
    question: 'Can I get a refund?',
    answer: 'We offer a 30-day money-back guarantee. Contact us within 30 days of purchase for a full refund.',
  },
];

const quickLinks = [
  { icon: FileText, label: 'Sample Analysis', href: '/sample-analysis' },
  { icon: Zap, label: 'Pricing', href: '/pricing' },
  { icon: BookOpen, label: 'Documentation', href: '#' },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e14] via-[#0b0f17] to-[#0a0e14]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
            <HelpCircle className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Get help with SearchFindr or contact us directly
          </p>
        </div>

        {/* Contact Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Mail className="h-6 w-6 text-emerald-400" />
            Contact Us
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-white/60 mb-2">Email us directly:</p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=SearchFindr Support Request`}
                className="inline-flex items-center gap-2 text-lg font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Mail className="h-5 w-5" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickLinks.map((link, idx) => {
              const Icon = link.icon;
              return (
                <Link
                  key={idx}
                  href={link.href}
                  className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <span className="text-white font-medium">{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/8 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-white/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Still Need Help */}
        <div className="mt-12 text-center">
          <div className="inline-block p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-2">
              Still need help?
            </h3>
            <p className="text-white/60 mb-4">
              We're here to help! Reach out via email.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=SearchFindr Support Request`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold transition-colors"
              >
                <Mail className="h-5 w-5" />
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
