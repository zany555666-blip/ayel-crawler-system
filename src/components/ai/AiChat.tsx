"use client";

import { useState } from "react";
import { useLang } from "@/i18n/LangContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AiChat() {
  const { t } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || t.ai.error }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t.common.error }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [t.ai.queryProduct, t.ai.analyzeOrder, t.ai.draftEmail, t.ai.backgroundCheck];

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--fg)]">AI 助手</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center mt-6">
            <p className="text-[13px] text-[var(--muted)]">{t.ai.welcome}</p>
            <p className="text-[12px] text-[var(--sub)] mt-3">{t.ai.tryAsking}</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-[11px] px-3 py-1.5 bg-[var(--surface2)] text-[var(--muted)] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--fg)] text-[var(--bg)] rounded-br-md"
                  : "bg-[var(--surface2)] text-[var(--fg)] rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface2)] px-4 py-2.5 rounded-2xl rounded-bl-md text-[13px] text-[var(--sub)]">
              <span className="animate-pulse">{t.ai.thinking}</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t.ai.placeholder}
            className="flex-1 h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-full text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-10 px-5 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition-all active:scale-[0.97]"
          >
            {t.ai.send}
          </button>
        </div>
      </div>
    </div>
  );
}
