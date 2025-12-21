// app/extension/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstString(v: string | string[] | undefined): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function safeInternalPath(p: string | null, fallback: string): string {
  if (!p) return fallback;
  // only allow internal paths to prevent open redirects
  if (!p.startsWith("/")) return fallback;
  return p;
}

export default function ExtensionCallback({ searchParams }: Props) {
  const router = useRouter();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const nextParam = firstString(searchParams?.next);
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

        // 3) Logged in → give content script time to read localStorage + store token
        timeout = setTimeout(() => {
          router.replace(safeNext);
        }, 900);
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
