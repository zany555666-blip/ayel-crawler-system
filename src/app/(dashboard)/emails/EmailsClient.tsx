"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Card";
import Link from "next/link";
import { Plus, RefreshCw, Loader2, Eye } from "lucide-react";
import { formatDateTime, statusMap } from "@/lib/utils";
import { useLang } from "@/i18n/LangContext";

interface Email {
  id: string;
  toAddress: string;
  subject: string;
  language: string;
  status: string;
  type: string;
  aiGenerated: boolean;
  createdAt: string;
  customer?: { name: string } | null;
}

export default function EmailsClient({ emails: initial }: { emails: Email[] }) {
  const { t } = useLang();
  const [emails, setEmails] = useState(initial);
  const [sending, setSending] = useState<Set<string>>(new Set());

  const handleSend = async (email: Email) => {
    setSending((prev) => new Set(prev).add(email.id));
    try {
      const res = await fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      if (res.ok) {
        setEmails((prev) =>
          prev.map((e) =>
            e.id === email.id ? { ...e, status: "sent" } : e
          )
        );
      }
    } catch {} finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(email.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.emails.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.emails.desc}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/emails/new"><Button variant="secondary"><Plus className="w-4 h-4" /> {t.emails.new}</Button></Link>
          <Link href="/emails/ai-generate"><Button><RefreshCw className="w-4 h-4" /> {t.emails.aiGenerate}</Button></Link>
        </div>
      </div>
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--sub)]">
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.recipient}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.subject}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.customer}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.type}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.language}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.status}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.time}</th>
              <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.emails.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface2)]">
            {emails.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-[13px] text-[var(--sub)]">
                  暂无邮件，点击"新建邮件"或"AI生成开发信"开始
                </td>
              </tr>
            ) : (
              emails.map((e) => {
                const st = statusMap(e.status);
                return (
                  <tr key={e.id} className="hover:bg-[var(--surface2)]/50 transition-colors">
                    <td className="px-6 py-3.5 text-[12px] text-[var(--fg)] max-w-[160px] truncate">{e.toAddress}</td>
                    <td className="px-6 py-3.5 max-w-[200px] truncate text-[13px] text-[var(--fg)]">{e.subject}</td>
                    <td className="px-6 py-3.5 text-[13px] text-[var(--muted)]">{e.customer?.name || "-"}</td>
                    <td className="px-6 py-3.5">{e.aiGenerated ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1a0a2e] text-[#bf5af2]">{t.emails.aiGenerated}</span> : <span className="text-[13px] text-[var(--muted)]">{e.type === "auto_reply" ? t.emails.autoReply : t.emails.manual}</span>}</td>
                    <td className="px-6 py-3.5 text-[11px] font-semibold text-[var(--sub)] uppercase">{e.language}</td>
                    <td className="px-6 py-3.5"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${e.status === "sent" ? "bg-[var(--okbg)] text-[var(--ok)]" : e.status === "failed" ? "bg-[var(--errbg)] text-[var(--err)]" : "bg-[var(--surface2)] text-[var(--muted)]"}`}>{st.label}</span></td>
                    <td className="px-6 py-3.5 text-[12px] text-[var(--sub)]">{formatDateTime(e.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/emails/${e.id}`} className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[var(--surface2)] transition" title="查看">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {e.status !== "sent" && (
                          <button
                            onClick={() => handleSend(e)}
                            disabled={sending.has(e.id)}
                            className="text-[13px] font-medium text-[var(--fg)] hover:underline disabled:opacity-40"
                          >
                            {sending.has(e.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t.emails.send}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
