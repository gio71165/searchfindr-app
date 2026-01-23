// app/extension/success/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ExtensionSuccess() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Try to close the window (may not work if not opened by script)
          setTimeout(() => {
            window.close();
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Extension Connected!
        </h1>

        {/* Description */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          Your SearchFindr Chrome extension is now connected to your account.
          You can start capturing on-market listings directly from your browser.
        </p>

        {/* Instructions */}
        <div className="bg-indigo-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-indigo-900 mb-2">
            Next steps:
          </p>
          <ol className="text-sm text-indigo-800 space-y-2 list-decimal list-inside">
            <li>Close this tab</li>
            <li>Open the SearchFindr extension popup</li>
            <li>It should now show <span className="font-semibold">"Connected"</span></li>
            <li>Start capturing listings!</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.close()}
            className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Close Tab
          </button>
        </div>

        {/* Auto-close notice */}
        {countdown > 0 && (
          <p className="mt-6 text-xs text-slate-500">
            This tab will close automatically in {countdown} second{countdown !== 1 ? "s" : ""}...
          </p>
        )}
      </div>
    </div>
  );
}
