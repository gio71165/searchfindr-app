// app/extension/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/supabaseClient";

export default function ExtensionCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        // Where to send the user AFTER the extension has captured the token
        const nextParam = searchParams?.get("next");
        // Only allow internal paths to avoid open-redirect issues
        const safeNext =
          nextParam && nextParam.startsWith("/") ? nextParam : "/extension/success";

        // 1) Check if user is logged in
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // 2) If not logged in, send them to home/login AND guarantee return to callback
        if (error || !session) {
          // Preserve where we want to land after login (back to this callback)
          router.replace(`/?next=${encodeURIComponent("/extension/callback?next=" + safeNext)}`);
          return;
        }

        // 3) Logged in: give content script time to read Supabase localStorage and store token
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
  }, [router, searchParams]);

  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h2>Connecting SearchFindr Extension…</h2>
      <p>Please wait a moment. This tab will redirect automatically.</p>
    </div>
  );
}
