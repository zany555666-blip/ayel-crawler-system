"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles, Loader2, Mail, Globe, Trash2 } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  country: string;
}

export default function NewEmailPage() {
  const router = useRouter();
  const { t } = useLang();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [language, setLanguage] = useState("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customContext, setCustomContext] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .catch(() => {});
  }, []);

  const customer = customers.find((c) => c.id === selectedCustomer);

  const handleGenerate = useCallback(async () => {
    if (!selectedCustomer) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/emails/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer,
          language,
          customContext,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubject(data.email?.subject || "");
        setBody(data.email?.body || data.aiResult || "");
      } else {
        setError(data.error || t.ai.generateFail);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setGenerating(false);
    }
  }, [selectedCustomer, language, customContext, t]);

  const handleSend = async () => {
    if (!subject || !body) return;
    setSending(true);
    setError("");
    try {
      const toAddress = customer?.email || "";
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer || null,
          toAddress,
          subject,
          body,
          language,
        }),
      });
      if (res.ok) {
        const email = await res.json();
        const sendRes = await fetch(`/api/emails/${email.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", toAddress, subject, body }),
        });
        if (sendRes.ok) {
          setSuccess(true);
          setTimeout(() => router.push("/emails"), 1500);
        } else {
          setError("发送失败，邮件已保存为草稿");
        }
      } else {
        const d = await res.json();
        setError(d.error || "保存失败");
      }
    } catch {
      setError(t.networkError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/emails" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.emails.new}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.emails.desc}</p>
        </div>
      </div>

      {success ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--okbg)] flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6 text-[var(--ok)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--fg)]">邮件已发送</h3>
          <p className="text-[13px] text-[var(--muted)] mt-2">即将跳转到邮件列表...</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                  收件客户
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
                >
                  <option value="">选择客户</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company}) — {c.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                  {t.emails.language}
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
            </div>

            {customer && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
                <Globe className="w-3 h-3" />
                <span>收件人: {customer.email}</span>
                {customer.country && <span>| {customer.country}</span>}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                AI 自定义上下文（可选）
              </label>
              <input
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="例如：重点介绍传感器产品线，强调价格优势..."
                className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedCustomer || generating}
              className="inline-flex items-center gap-2 h-10 px-5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--fg)] text-[13px] font-medium rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> AI 生成中...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> AI 生成开发信</>
              )}
            </button>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                {t.vendors.subject}
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="邮件主题..."
                className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                {t.vendors.body}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                placeholder="邮件正文..."
                className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition resize-none font-mono"
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSend}
                disabled={sending || !subject || !body}
                className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition active:scale-[0.97]"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 发送中...</>
                ) : (
                  <><Send className="w-4 h-4" /> 发送邮件</>
                )}
              </button>
              <Link
                href="/emails"
                className="inline-flex items-center h-10 px-5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[13px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition"
              >
                取消
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
