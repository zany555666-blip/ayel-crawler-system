"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Mail, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import { formatDateTime } from "@/lib/utils";

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLang();

  const [email, setEmail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/emails")
      .then((r) => r.json())
      .then((emails) => {
        const found = emails.find((e: any) => e.id === params.id);
        setEmail(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSend = async () => {
    if (!email) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/emails/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      if (res.ok) {
        setSent(true);
        setEmail((prev: any) => ({ ...prev, status: "sent", sentAt: new Date().toISOString() }));
      } else {
        const d = await res.json();
        setError(d.error || "发送失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!email || !confirm("确定删除这封邮件？")) return;
    try {
      await fetch(`/api/emails/${email.id}`, { method: "DELETE" });
      router.push("/emails");
    } catch {
      setError("删除失败");
    }
  };

  if (loading) return <div className="text-[var(--sub)] text-sm py-20 text-center">{t.common.loading}</div>;
  if (!email) return <div className="text-[var(--sub)] text-sm py-20 text-center">邮件不存在</div>;

  const statusIcon = email.status === "sent"
    ? <CheckCircle className="w-4 h-4 text-[var(--ok)]" />
    : email.status === "failed"
    ? <XCircle className="w-4 h-4 text-[var(--err)]" />
    : <Clock className="w-4 h-4 text-[var(--muted)]" />;

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/emails" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight truncate">{email.subject}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5 flex items-center gap-2">
            {statusIcon}
            <span>{email.status === "sent" ? "已发送" : email.status === "failed" ? "发送失败" : "草稿"}</span>
            {email.sentAt && <span>· {formatDateTime(email.sentAt)}</span>}
          </p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1">发件人</p>
            <p className="text-[13px] text-[var(--fg)]">{email.fromAddress}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1">收件人</p>
            <p className="text-[13px] text-[var(--fg)]">{email.toAddress}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1">主题</p>
          <p className="text-[14px] font-medium text-[var(--fg)]">{email.subject}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-[12px]">
          <div>
            <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-0.5">语言</p>
            <p className="text-[var(--fg)] uppercase font-medium">{email.language}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-0.5">类型</p>
            <p className="text-[var(--fg)]">{email.aiGenerated ? "AI 生成" : email.type === "auto_reply" ? "自动回复" : "手动"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-0.5">创建时间</p>
            <p className="text-[var(--muted)]">{formatDateTime(email.createdAt)}</p>
          </div>
        </div>

        <div className="border-t border-[var(--surface2)] pt-5">
          <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">正文</p>
          <div className="bg-[var(--surface2)] rounded-xl p-5">
            <pre className="text-[13px] text-[var(--muted)] whitespace-pre-wrap font-sans leading-relaxed">{email.body}</pre>
          </div>
        </div>

        {error && <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          {email.status !== "sent" && (
            <button
              onClick={handleSend}
              disabled={sending || sent}
              className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition active:scale-[0.97]"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> 发送中...</> : sent ? <><CheckCircle className="w-4 h-4" /> 已发送</> : <><Send className="w-4 h-4" /> 发送邮件</>}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--err)] text-[13px] font-medium rounded-full hover:bg-[var(--errbg)] transition"
          >
            <Trash2 className="w-4 h-4" /> 删除
          </button>
        </div>
      </div>
    </div>
  );
}
