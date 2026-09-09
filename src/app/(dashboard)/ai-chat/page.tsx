"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function AiChatPage() {
  const { t } = useLang();
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const u = input.trim(); setInput(""); setMsgs((p) => [...p, { role: "user", text: u }]); setLoading(true);
    try {
      const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: u, history: msgs }) });
      const d = await r.json();
      setMsgs((p) => [...p, { role: "assistant", text: d.reply || t.ai.generateFail }]);
    } catch { setMsgs((p) => [...p, { role: "assistant", text: t.networkError }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 h-[calc(100vh-120px)] flex flex-col">
      <div>
        <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.ai.title}</h1>
        <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.ai.desc}</p>
      </div>
      <div className="flex-1 bg-[var(--surface)] rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {msgs.length === 0 && (
            <div className="text-center mt-10">
              <Sparkles className="w-8 h-8 text-[#333] mx-auto mb-3" />
              <p className="text-[13px] text-[var(--sub)]">{t.ai.welcome}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {t.ai.quickPrompts.map((text: string) => (
                  <button key={text} onClick={() => setInput(text)} className="text-[11px] px-3 py-1.5 bg-[var(--surface2)] text-[var(--muted)] rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition">{text}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] ${m.role === "user" ? "bg-[var(--fg)] text-[var(--bg)] rounded-br-md" : "bg-[var(--surface2)] text-[var(--fg)] rounded-bl-md"}`}>{m.text}</div>
            </div>
          ))}
          {loading && <div className="text-[var(--sub)] text-[13px] animate-pulse">{t.ai.thinking}</div>}
        </div>
        <div className="p-4 border-t border-[var(--border)] flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t.ai.placeholder} className="flex-1 h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-full text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]" />
          <button onClick={send} disabled={loading || !input.trim()} className="h-10 px-5 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
