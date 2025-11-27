import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SearchFindr',
  description: 'AI-powered deal sourcing and analysis for search funds and ETA buyers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
