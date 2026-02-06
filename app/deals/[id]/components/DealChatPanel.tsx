'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import type { ChatMsg } from '../lib/types';
import type { Deal } from '@/lib/types/deal';
import { User, Bot, Send, Copy, X, MessageCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function DealChatPanel({ dealId, deal }: { dealId: string; deal: Deal }) {
  // Chat is available for ALL deal types: on-market, off-market, CIM, and financials
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
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
        { text: "📊 Should I proceed?", icon: "📊" },
        { text: "⚡ What's my next step?", icon: "⚡" },
      ];
    }
    
    if (sourceType === "financials") {
      return [
        { text: "📊 Analyze the numbers", icon: "📊" },
        { text: "⚠️ What's the QoE risk?", icon: "⚠️" },
        { text: "❓ What's missing?", icon: "❓" },
        { text: "⚡ What's my next step?", icon: "⚡" },
      ];
    }
    
    // Default prompts
    return [
      { text: "🚩 Red flags?", icon: "🚩" },
      { text: "💰 Financials?", icon: "💰" },
      { text: "📊 Should I proceed?", icon: "📊" },
      { text: "⚡ What's my next step?", icon: "⚡" },
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

  // Scroll to bottom of messages container only (not the whole page)
  // Only auto-scroll if user is already near the bottom (within 150px) or actively sending
  useEffect(() => {
    if (messagesContainerRef.current && endRef.current) {
      const container = messagesContainerRef.current;
      const scrollDistance = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = scrollDistance < 150;
      
      // Only auto-scroll if:
      // 1. User is already near bottom (within 150px), OR
      // 2. User is actively sending a message (sending = true)
      // This prevents jumping when loading history or when user is reading old messages
      if (isNearBottom || sending) {
        // Use setTimeout with minimal delay to ensure DOM is updated, but keep it subtle
        const timeoutId = setTimeout(() => {
          if (container && messagesContainerRef.current === container) {
            // Only scroll if still near bottom or sending
            const currentScrollDistance = container.scrollHeight - container.scrollTop - container.clientHeight;
            if (currentScrollDistance < 200 || sending) {
              container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth"
              });
            }
          }
        }, 50);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, sending]);

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

      // Build history: exclude welcome message and only include actual Q&A pairs
      const welcomeMessage = "Ask me anything about this deal. Click a prompt below or type your own question.";
      const history = nextMsgs
        .filter((m) => {
          // Include user messages and assistant messages that aren't the welcome message
          if (m.role === "user") return true;
          if (m.role === "assistant" && m.content !== welcomeMessage) return true;
          return false;
        })
        .slice(-10) // Last 10 turns (5 Q&A pairs)
        .map((m) => ({ role: m.role, content: m.content }));

      let res: Response;
      try {
        res = await fetch("/api/deal-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dealId,
            message: text,
            history,
          }),
        });
      } catch (fetchError) {
        // Network error or fetch failed
        console.error("Chat fetch error:", fetchError);
        throw new Error("Network error. Please check your connection and try again.");
      }

      const raw = await res.text();
      let json: { answer?: string; content?: string; error?: string; warning?: string } | null = null;
      try {
        json = JSON.parse(raw);
      } catch (parseError) {
        // If response isn't valid JSON, log the raw response for debugging
        console.error("Chat API response parse error:", parseError, "Raw response:", raw.substring(0, 500));
        throw new Error(`Invalid response from server (${res.status})`);
      }

      if (!res.ok) {
        // Log error for debugging but show friendly message to user
        const errorMessage = json?.error || `Server error (${res.status})`;
        console.error("Chat API error:", { 
          status: res.status, 
          statusText: res.statusText,
          error: json?.error || 'No error message in response',
          json: json,
          raw: raw.substring(0, 500) // Log first 500 chars for debugging
        });
        
        throw new Error(errorMessage || `Server error (${res.status})`);
      }

      const answer = String(json?.answer ?? json?.content ?? "").trim();
      if (!answer) {
        console.error("Chat API returned empty answer", { json, raw: raw.substring(0, 200) });
        throw new Error("The AI didn't return a response. Please try again.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: answer, ts: Date.now() }]);
      // Track chat usage
      window.dispatchEvent(new CustomEvent('onboarding:chat-used'));
    } catch (e: unknown) {
      // Always show friendly message to users, log technical details for debugging
      const error = e instanceof Error ? e : new Error('Unknown error');
      console.error("Chat error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Use error message if it's user-friendly, otherwise show generic message
      let friendlyMessage: string;
      if (error.message && 
          !error.message.includes('API_ERROR') && 
          !error.message.includes('EMPTY_ANSWER') &&
          !error.message.includes('Invalid response') &&
          !error.message.includes('Network error')) {
        friendlyMessage = error.message;
      } else if (error.message?.includes('Network error')) {
        friendlyMessage = "Network error. Please check your connection and try again.";
      } else {
        friendlyMessage = "Something went wrong. Please try again later, or contact support if the issue persists.";
      }
      
      setErr(friendlyMessage);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: friendlyMessage, ts: Date.now() },
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
    <div className="flex flex-col h-full min-h-0 bg-slate-950 border-l border-slate-800">
      {/* Header - fixed height */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Deal Assistant</h2>
          <p className="text-xs text-slate-500 mt-1">Ask questions about this deal</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="text-xs text-slate-400 hover:text-slate-300 underline"
          >
            Clear
          </button>
          {isMobile && (
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages - scrollable, takes remaining space */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-3" 
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          const msgId = `${m.role}-${idx}`;
          return (
            <div
              key={idx}
              className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-emerald-400" />
                </div>
              )}
              <div
                className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                  isUser
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                <p className="whitespace-pre-line text-xs leading-relaxed">{m.content}</p>
                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-500">
                    {formatTime(m.ts ?? Date.now())}
                  </span>
                  <button
                    onClick={() => copyMessage(m.content, msgId)}
                    className="p-0.5 rounded hover:bg-slate-700 transition-colors"
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
                <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="bg-slate-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LoadingSpinner size="sm" />
                <span>Analyzing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Error */}
      {err && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-slate-800 bg-red-950/20">
          <p className="text-xs text-red-400">{err}</p>
        </div>
      )}

      {/* Input - always visible at bottom */}
      <div className="flex-shrink-0 border-t border-slate-800 p-4">
        {/* Prompt Chips */}
        {corePrompts.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {corePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onClickPrompt(prompt)}
                disabled={sending}
                className="px-3 py-2.5 text-xs rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors min-h-[44px]"
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
            className="flex-1 min-h-[60px] px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 resize-none"
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
            className="btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          AI outputs are signals, not conclusions.
        </p>
      </div>
    </div>
  );

  // Desktop: Sticky sidebar with fixed height so messages scroll and input stays visible
  if (!isMobile) {
    return (
      <aside className="hidden lg:block w-[400px] flex-shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] min-h-0 flex flex-col overflow-hidden">
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
          className="btn-secondary fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
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
