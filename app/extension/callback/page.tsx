// app/extension/callback/page.tsx
"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/supabaseClient";

function safeInternalPath(p: string | null, fallback: string): string {
  if (!p) return fallback;
  // only allow internal paths to prevent open redirects
  if (!p.startsWith("/")) return fallback;
  return p;
}

function ExtensionCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const nextParam = searchParams.get("next");
        const safeNext = safeInternalPath(nextParam, "/extension/success");

        // 1) Check login state
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // 2) Not logged in → send to home with next back to THIS callback
        if (error || !session) {
          const returnTo = `/extension/callback?next=${encodeURIComponent(safeNext)}`;
          router.replace(`/?next=${encodeURIComponent(returnTo)}`);
          return;
        }

        // 3) Logged in → inject token into page for content script to read
        // Inject a script that runs in page context (not isolated world)
        // This script can access localStorage and communicate with content script
        const accessToken = session.access_token;
        
        // Inject script that posts message to content script
        const script = document.createElement("script");
        script.textContent = `
          (function() {
            const token = ${JSON.stringify(accessToken)};
            // Post message to window for content script to receive
            window.postMessage({
              type: 'SEARCHFINDR_EXTENSION_TOKEN',
              token: token
            }, window.location.origin);
            
            // Also store in a data attribute as backup
            document.documentElement.setAttribute('data-searchfindr-token', token);
          })();
        `;
        document.documentElement.appendChild(script);
        script.remove();

        // 4) Give content script time to receive token and save it
        timeout = setTimeout(() => {
          router.replace(safeNext);
        }, 2000);
      } catch {
        router.replace(`/?next=${encodeURIComponent("/extension/callback")}`);
      }
    })();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
    // Intentionally not depending on searchParams object identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h2>Connecting SearchFindr Extension…</h2>
      <p>Please wait a moment. This tab will redirect automatically.</p>
    </div>
  );
}

export default function ExtensionCallback() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
        <h2>Connecting SearchFindr Extension…</h2>
        <p>Please wait a moment.</p>
      </div>
    }>
      <ExtensionCallbackContent />
    </Suspense>
  );
}
