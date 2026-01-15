'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { ChatMsg } from '../lib/types';
import type { Deal } from '@/lib/types/deal';
import { User, Bot, Send, Copy, Loader2, X, MessageCircle } from 'lucide-react';

export function DealChatPanel({ dealId, deal }: { dealId: string; deal: Deal }) {
  // Chat is now available on ALL deal types
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: "Ask me anything about this deal. Click a prompt below or type your own question.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Core prompts - customized by deal type
  const corePrompts = useMemo(() => {
    const sourceType = deal?.source_type;
    
    if (sourceType === "on_market") {
      return [
        { text: "💰 Is this price fair?", icon: "💰" },
        { text: "🚩 What are the risks?", icon: "🚩" },
        { text: "📊 Worth pursuing?", icon: "📊" },
        { text: "❓ What should I ask?", icon: "❓" },
      ];
    }
    
    if (sourceType === "off_market") {
      return [
        { text: "📞 Should I contact them?", icon: "📞" },
        { text: "❓ What questions should I ask?", icon: "❓" },
        { text: "🚩 What are the risks?", icon: "🚩" },
        { text: "📊 Is this a good fit?", icon: "📊" },
      ];
    }
    
    if (sourceType === "cim_pdf") {
      return [
        { text: "🚩 Red flags?", icon: "🚩" },
        { text: "💰 Financials?", icon: "💰" },
        { text: "📊 Worth it?", icon: "📊" },
        { text: "❓ Ask seller?", icon: "❓" },
      ];
    }
    
    if (sourceType === "financials") {
      return [
        { text: "📊 Analyze the numbers", icon: "📊" },
        { text: "⚠️ What's the QoE risk?", icon: "⚠️" },
        { text: "❓ What's missing?", icon: "❓" },
        { text: "✅ What looks good?", icon: "✅" },
      ];
    }
    
    // Default prompts
    return [
      { text: "🚩 Red flags?", icon: "🚩" },
      { text: "💰 Financials?", icon: "💰" },
      { text: "📊 Worth it?", icon: "📊" },
      { text: "❓ Ask seller?", icon: "❓" },
    ];
  }, [deal?.source_type]);

  // Load persisted chat history
  const fetchMessages = React.useCallback(async () => {
    if (!dealId) return;

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

      if (loaded.length > 0) {
        setMessages(
          loaded.map((m: { role?: string; content?: string }) => ({
            role: m.role || 'assistant',
            content: m.content || '',
            ts: Date.now(),
          }))
        );
      } else {
        setMessages([
          {
            role: "assistant",
            content: "Ask me anything about this deal. Click a prompt below or type your own question.",
            ts: Date.now(),
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, [dealId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleClearChat = async () => {
    if (!dealId) return;
    const yes = window.confirm("Clear all chat history for this deal?");
    if (!yes) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      await fetch(`/api/deal-chat/clear?dealId=${encodeURIComponent(dealId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages([
        {
          role: "assistant",
          content: "Ask me anything about this deal. Click a prompt below or type your own question.",
          ts: Date.now(),
        },
      ]);
      setErr(null);
    } catch {
      // ignore
    }
  };

  const buildContext = () => {
    const parts: string[] = [];
    if (deal?.company_name) parts.push(`Company: ${deal.company_name}`);
    if (deal?.location_city && deal?.location_state) {
      parts.push(`Location: ${deal.location_city}, ${deal.location_state}`);
    }
    if (deal?.industry) parts.push(`Industry: ${deal.industry}`);
    if (deal?.ai_summary) parts.push(`Summary: ${deal.ai_summary}`);
    return parts.join("\n");
  };

  const sendMessage = async (q: string) => {
    const text = (q || "").trim();
    if (!text || sending) return;

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
      let json: { answer?: string; content?: string; error?: string } | null = null;
      try {
        json = JSON.parse(raw);
      } catch {}

      if (!res.ok) throw new Error(json?.error || `Chat failed (HTTP ${res.status})`);

      const answer = String(json?.answer ?? json?.content ?? "").trim();
      if (!answer) throw new Error("No answer returned from chat route.");

      setMessages((prev) => [...prev, { role: "assistant", content: answer, ts: Date.now() }]);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setErr(error.message || "Failed to send chat.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry — chat failed. Try again.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onClickPrompt = (prompt: { text: string; icon: string }) => {
    const questionText = prompt.text.replace(/[🚩💰📊❓]/g, '').trim();
    setInput(questionText);
    setFreeformEnabled(true);
  };

  const [freeformEnabled, setFreeformEnabled] = useState(false);

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Chat is always available now

  const chatContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">Ask about this deal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
          >
            Clear
          </button>
          {isMobile && (
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          const msgId = `${m.role}-${idx}`;
          return (
            <div
              key={idx}
              className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                </div>
              )}
              <div
                className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                  isUser
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                }`}
              >
                <p className="whitespace-pre-line text-xs leading-relaxed">{m.content}</p>
                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatTime(m.ts ?? Date.now())}
                  </span>
                  <button
                    onClick={() => copyMessage(m.content, msgId)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    title="Copy"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                </div>
                {copiedId === msgId && (
                  <div className="absolute -top-6 right-0 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Copied!
                  </div>
                )}
              </div>
              {isUser && (
                <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Error */}
      {err && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-red-50 dark:bg-red-950/20">
          <p className="text-xs text-red-700 dark:text-red-300">{err}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        {/* Prompt Chips */}
        {corePrompts.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {corePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onClickPrompt(prompt)}
                disabled={sending}
                className="px-3 py-1 text-xs rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (!freeformEnabled && e.target.value.trim()) {
                setFreeformEnabled(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  sendMessage(input);
                  setInput("");
                }
              }
            }}
            disabled={sending}
            placeholder="Ask about this deal..."
            className="flex-1 min-h-[60px] px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            rows={2}
          />
          <button
            onClick={() => {
              if (input.trim()) {
                sendMessage(input);
                setInput("");
              }
            }}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          AI outputs are signals, not conclusions.
        </p>
      </div>
    </div>
  );

  // Desktop: Sticky sidebar
  if (!isMobile) {
    return (
      <aside className="hidden lg:block w-[400px] flex-shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)]">
          {chatContent}
        </div>
      </aside>
    );
  }

  // Mobile: Floating button + Drawer
  return (
    <>
      {/* Floating Chat Button */}
      {!isMobileDrawerOpen && (
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Mobile Drawer */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
            isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMobileDrawerOpen(false)}
        />
        {/* Drawer */}
        <div
          className={`
            fixed bottom-0 left-0 right-0 z-50 h-[80vh] 
            rounded-t-xl overflow-hidden 
            transition-transform duration-300 ease-in-out
            ${isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}
          `}
        >
          {chatContent}
        </div>
      </>
    </>
  );
}
