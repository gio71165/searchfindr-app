'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { ChatMsg, PromptKind } from '../lib/types';

export function DealChatPanel({ dealId, deal }: { dealId: string; deal: any }) {
  // Flags (must be declared BEFORE effects that use them)
  const canUseChat = deal?.source_type === "cim_pdf" || deal?.source_type === "on_market";

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Guided mode: click a suggested question. You can switch to 'Ask my own question' anytime.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // UX controls
  const [guidedMode, setGuidedMode] = useState(true);
  const [freeformEnabled, setFreeformEnabled] = useState(false); // "Ask my own question"
  const [promptView, setPromptView] = useState<PromptKind>("core");

  // Core prompt usage (per deal session)
  const [usedCore, setUsedCore] = useState<Record<string, boolean>>({});
  // Follow-up usage (rotate without "infinite rewording")
  const [followupUsed, setFollowupUsed] = useState<string[]>([]);

  // Load persisted chat history on mount / deal change / page focus (per-user)
  // IMPORTANT: Re-fetches when navigating back to ensure we have the latest messages
  const fetchMessages = React.useCallback(async () => {
    if (!dealId || !canUseChat) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/deal-chat?dealId=${encodeURIComponent(dealId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const json = await res.json();
      const loaded = Array.isArray(json?.messages) ? json.messages : [];

      // Always update messages state to respect what the backend returns
      // If backend returns empty array (after clearing), reset to default intro
      // Otherwise, use the loaded messages
      if (loaded.length > 0) {
        // Replace your default assistant intro with the real history
        setMessages(
          loaded.map((m: any) => ({
            role: m.role,
            content: m.content,
            ts: Date.now(),
          }))
        );
      } else {
        // Backend returned empty array - reset to default intro (respects DELETE)
        setMessages([
          {
            role: "assistant",
            content:
              "Guided mode: click a suggested question. You can switch to 'Ask my own question' anytime.",
            ts: Date.now(),
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, [dealId, canUseChat]);

  // Fetch on mount and when dealId/canUseChat changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Re-fetch when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    };

    const handleFocus = () => {
      fetchMessages();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchMessages]);

  // Clear chat (UI + Supabase)
  // Uses your existing DELETE /api/deal-chat handler (Bearer token auth)
  const handleClearChat = async () => {
    try {
      if (!dealId || sending) return;

      setErr(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setErr("Not authenticated.");
        return;
      }

      const res = await fetch(`/api/deal-chat?dealId=${encodeURIComponent(dealId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        setErr(raw || "Failed to clear chat.");
        return;
      }

      // Success: clear UI immediately after backend clears
      setMessages([]);
      
      // Show success message (optional - you can remove this if you don't want a message)
      setErr(null);
    } catch (e) {
      console.warn("Clear chat failed:", e);
      setErr("Failed to clear chat.");
    }
  };

  // Helpers
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const buildContext = () => {
    return {
      source_type: deal?.source_type ?? null,
      company_name: deal?.company_name ?? null,
      location_city: deal?.location_city ?? null,
      location_state: deal?.location_state ?? null,
      ai_summary: deal?.ai_summary ?? null,
      ai_red_flags: deal?.ai_red_flags ?? null,
      ai_financials_json: deal?.ai_financials_json ?? null,
      ai_scoring_json: deal?.ai_scoring_json ?? null,
      criteria_match_json: deal?.criteria_match_json ?? null,
      ai_confidence_json: deal?.ai_confidence_json ?? null,
      raw_listing_text_snippet:
        typeof deal?.raw_listing_text === "string" ? deal.raw_listing_text.slice(0, 4000) : null,
    };
  };

  // Prompt sets (small + stable)
  const corePrompts = useMemo(() => {
    const isCim = deal?.source_type === "cim_pdf";
    const isOnMarket = deal?.source_type === "on_market";

    if (isCim) {
      return [
        "Summarize this deal in 6 bullets (business, customers, economics, moat, risks, next step).",
        "What would you verify first before spending more time on this?",
        "What are the top 3 risks, and what specific evidence supports each one from the CIM?",
        "What is the #1 diligence question you would ask management on the first call?",
        "Based on confidence signals, what is most likely wrong, missing, or overstated?",
        "Given the snapshot, what sanity-check would you run to validate earnings quality?",
      ];
    }

    if (isOnMarket) {
      return [
        "Summarize this listing in 6 bullets (who/what/where, why sell, economics, risks, next step).",
        "What are the biggest hidden risks given typical broker language?",
        "What 3 questions would you ask the broker to qualify this quickly?",
        "What would make this an immediate 'no' vs worth a call?",
        "What should I verify first to avoid wasting time?",
      ];
    }

    return ["Summarize the deal quickly.", "What would you verify first?", "What are the biggest risks?"];
  }, [deal?.source_type]);

  // Follow-ups: stable, not endlessly reworded
  const followupPool = useMemo(
    () => [
      "What evidence supports that?",
      "How do I verify that quickly (cheap tests first)?",
      "What would change your mind?",
      "Turn your answer into a diligence checklist (top 8 items).",
      "If this is wrong, what's the most likely alternative explanation?",
      "What's the #1 number I should pressure-test?",
      "What's the quickest way this deal fails post-close?",
      "What's the highest-impact question to ask next?",
    ],
    []
  );

  // Compute visible prompts (few only)
  const visiblePrompts = useMemo(() => {
    if (!guidedMode || !canUseChat) return [];

    if (promptView === "core") {
      const remaining = corePrompts.filter((p) => !usedCore[p]);
      return remaining.slice(0, 5);
    }

    const unused = followupPool.filter((p) => !followupUsed.includes(p));
    const take = (arr: string[], n: number) => arr.slice(0, n);
    const next = unused.length >= 3 ? take(unused, 3) : take([...unused, ...followupPool], 3);
    return next;
  }, [guidedMode, canUseChat, promptView, corePrompts, usedCore, followupPool, followupUsed]);

  // Send logic (used by typed input or prompt clicks)
  const sendMessage = async (q: string, meta?: { fromPrompt?: boolean; promptText?: string }) => {
    const text = (q || "").trim();
    if (!text || sending) return;

    if (!canUseChat) {
      setErr("Chat is only enabled for CIM and on-market deals.");
      return;
    }

    setErr(null);
    setSending(true);

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: text, ts: Date.now() }];
    setMessages(nextMsgs);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const res = await fetch("/api/deal-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealId,
          message: text,
          context: buildContext(),
          history: nextMsgs
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const raw = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(raw);
      } catch {}

      if (!res.ok) throw new Error(json?.error || `Chat failed (HTTP ${res.status})`);

      const answer = String(json?.answer ?? json?.content ?? "").trim();
      if (!answer) throw new Error("No answer returned from chat route.");

      setMessages((prev) => [...prev, { role: "assistant", content: answer, ts: Date.now() }]);

      if (guidedMode) setPromptView("followup");
    } catch (e: any) {
      setErr(e?.message || "Failed to send chat.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — chat failed. Try again.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Click a suggested prompt
  const onClickPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    if (promptView === "core") {
      setUsedCore((prev) => ({ ...prev, [promptText]: true }));
      setPromptView("followup");
    } else {
      setFollowupUsed((prev) => [...prev, promptText]);
    }

    await sendMessage(promptText, { fromPrompt: true, promptText });
  };

  const resetGuided = () => {
    setUsedCore({});
    setFollowupUsed([]);
    setPromptView("core");
    setErr(null);
  };

  // Render (Clear persists via DELETE /api/deal-chat)
  return (
    <aside className="lg:col-span-1">
      <div className="card-section sticky top-6 h-[100vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold">AI Deal Assistant</h2>
            <p className="text-[11px] text-muted-foreground">
              Context-aware analysis for this specific deal
            </p>
          </div>

          <div className="flex items-center gap-2">
            {guidedMode ? (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                Guided
              </span>
            ) : null}
            {!canUseChat ? (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Disabled
              </span>
            ) : null}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 ai-chat-panel overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      isUser
                        ? "max-w-[92%] rounded-2xl px-3 py-2 ai-bubble-user"
                        : "max-w-[92%] rounded-2xl px-3 py-2 ai-bubble-assistant"
                    }
                  >
                    <p className="whitespace-pre-line text-[13px] leading-snug">{m.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Error */}
          {err ? (
            <div className="px-4 pb-2">
              <p className="text-xs text-destructive">{err}</p>
            </div>
          ) : null}

          {/* Prompt bubbles (dock above input, always visible) */}
          {guidedMode && canUseChat ? (
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wide opacity-70">
                  {promptView === "core" ? "Suggested questions" : "Follow-ups"}
                </p>

                <div className="flex items-center gap-2">
                  {promptView === "followup" ? (
                    <button type="button" onClick={() => setPromptView("core")} className="ai-chip-btn">
                      Back
                    </button>
                  ) : null}

                  <button type="button" onClick={resetGuided} className="ai-chip-btn">
                    Reset
                  </button>
                </div>
              </div>

              {visiblePrompts.length === 0 ? (
                <div className="text-[11px] opacity-70">No more prompts — reset.</div>
              ) : (
                <div className="space-y-2">
                  {visiblePrompts.slice(0, 4).map((p) => (
                    <div key={p} className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onClickPrompt(p)}
                        disabled={sending}
                        className="max-w-[92%] rounded-2xl px-3 py-2 ai-bubble-prompt text-left disabled:opacity-60"
                        title="Click to ask"
                      >
                        <p className="whitespace-pre-line text-[13px] leading-snug">{p}</p>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFreeformEnabled(true)}
                  disabled={!canUseChat}
                  className="ai-chip-btn disabled:opacity-50"
                >
                  Ask my own question
                </button>

                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={sending || !canUseChat}
                  className="ai-chip-btn disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {/* Input */}
          <div className="px-4 pb-4 pt-3 border-t ai-chat-divider">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!freeformEnabled) return;
                    sendMessage(input);
                    setInput("");
                  }
                }}
                disabled={sending || !canUseChat || !freeformEnabled}
                placeholder={
                  !canUseChat
                    ? "Chat disabled for this deal type"
                    : freeformEnabled
                    ? "Ask the AI about this deal…"
                    : "Enable 'Ask my own question'"
                }
                className="w-full px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring ai-chat-input"
              />

              <button
                type="button"
                onClick={() => {
                  if (!freeformEnabled) return;
                  sendMessage(input);
                  setInput("");
                }}
                disabled={sending || !canUseChat || !freeformEnabled || !input.trim()}
                className="px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50 ai-chat-send"
                title="Send"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>

            <div className="mt-2 text-[10px] opacity-70">
              AI outputs are signals, not conclusions. Verify during diligence.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
