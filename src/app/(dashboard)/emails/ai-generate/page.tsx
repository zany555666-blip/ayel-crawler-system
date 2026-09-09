"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Mail, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  country: string;
}

export default function AiGeneratePage() {
  const router = useRouter();
  const { t } = useLang();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState("en");
  const [customContext, setCustomContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .catch(() => {});
  }, []);

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map((c) => c.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedCustomers.size === 0) return;
    setGenerating(true);
    setError("");
    setResults([]);

    const selected = customers.filter((c) => selectedCustomers.has(c.id));

    for (const customer of selected) {
      try {
        const res = await fetch("/api/emails/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            language,
            customContext,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setResults((prev) => [
            ...prev,
            {
              customer: customer.name,
              company: customer.company,
              email: customer.email,
              subject: data.email?.subject || "",
              body: data.aiResult || "",
              saved: true,
              emailId: data.email?.id,
            },
          ]);
        } else {
          setResults((prev) => [
            ...prev,
            {
              customer: customer.name,
              company: customer.company,
              email: customer.email,
              subject: "",
              body: data.error || "生成失败",
              saved: false,
            },
          ]);
        }
      } catch {
        setResults((prev) => [
          ...prev,
          {
            customer: customer.name,
            company: customer.company,
            email: customer.email,
            subject: "",
            body: "网络错误",
            saved: false,
          },
        ]);
      }
    }
    setGenerating(false);
  };

  const handleSendAll = async () => {
    for (const r of results) {
      if (!r.emailId) continue;
      try {
        await fetch(`/api/emails/${r.emailId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send" }),
        });
      } catch {}
    }
    alert("所有邮件已发送！");
    router.push("/emails");
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-4">
        <Link href="/emails" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.emails.aiGenerate}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">AI 批量生成多语言开发信</p>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-[var(--muted)]">
              已生成 {results.length} 封邮件，{results.filter((r) => r.saved).length} 封已保存
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setResults([]); setSelectedCustomers(new Set()); }} className="h-9 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[12px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition">
                重新生成
              </button>
              <button onClick={handleSendAll} className="h-9 px-5 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]">
                <SendIcon className="w-3.5 h-3.5 inline mr-1.5" />
                批量发送全部
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(r.customer) ? next.delete(r.customer) : next.add(r.customer);
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface2)] transition"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[var(--sub)]" />
                    <div className="text-left">
                      <p className="text-[13px] font-medium text-[var(--fg)]">{r.customer}</p>
                      <p className="text-[11px] text-[var(--sub)]">{r.company} · {r.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.saved ? (
                      <span className="text-[11px] text-[var(--ok)] flex items-center gap-1"><Check className="w-3 h-3" /> 已生成</span>
                    ) : (
                      <span className="text-[11px] text-[#ff3b30]">失败</span>
                    )}
                    {expanded.has(r.customer) ? <ChevronUp className="w-4 h-4 text-[var(--sub)]" /> : <ChevronDown className="w-4 h-4 text-[var(--sub)]" />}
                  </div>
                </button>
                {expanded.has(r.customer) && (
                  <div className="px-5 pb-5 space-y-3 border-t border-[var(--surface2)] pt-4">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1">主题</p>
                      <p className="text-[13px] text-[var(--fg)]">{r.subject || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1">正文</p>
                      <pre className="text-[13px] text-[var(--muted)] whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto bg-[var(--surface2)] rounded-xl p-4">{r.body}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">
                  自定义提示
                </label>
                <input
                  value={customContext}
                  onChange={(e) => setCustomContext(e.target.value)}
                  placeholder="例如：推广传感器产品线"
                  className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h3 className="text-sm font-semibold text-[var(--fg)]">选择目标客户</h3>
              <button
                onClick={selectAll}
                className="text-[12px] text-[var(--muted)] hover:text-[var(--fg)] transition"
              >
                {selectedCustomers.size === customers.length && customers.length > 0 ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="divide-y divide-[var(--surface2)] max-h-80 overflow-y-auto">
              {customers.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface2)]/50 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                    className="w-4 h-4 accent-white rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--fg)] truncate">{c.name}</p>
                    <p className="text-[11px] text-[var(--sub)] truncate">
                      {c.company} · {c.email}
                      {c.country && ` · ${c.country}`}
                    </p>
                  </div>
                </label>
              ))}
              {customers.length === 0 && (
                <div className="px-5 py-12 text-center text-[13px] text-[var(--sub)]">
                  暂无客户，请先在客户管理中添���客户
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={selectedCustomers.size === 0 || generating}
            className="inline-flex items-center gap-2 h-11 px-8 bg-[var(--fg)] text-[var(--bg)] text-[14px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition active:scale-[0.97]"
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 正在生成 {selectedCustomers.size} 封邮件...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> 生成 {selectedCustomers.size} 封开发信</>
            )}
          </button>
        </>
      )}
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2L7 9M14 2L10 14L7 9M14 2L2 6L7 9" />
    </svg>
  );
}
