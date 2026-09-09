"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, CheckCircle, XCircle, Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", smtpHost: "smtp.qq.com", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50 });

  useEffect(() => {
    fetch("/api/email-accounts").then(r => r.json()).then(setAccounts).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const res = await fetch("/api/email-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const a = await res.json();
      setAccounts([...accounts, a]);
      setShowAdd(false);
      setForm({ email: "", smtpHost: "smtp.qq.com", smtpPort: 587, smtpUser: "", smtpPass: "", dailyLimit: 50 });
    } else {
      const d = await res.json();
      alert(d.error || "添加失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此邮箱？")) return;
    await fetch(`/api/email-accounts/${id}`, { method: "DELETE" });
    setAccounts(p => p.filter(a => a.id !== id));
  };

  if (loading) return <div className="text-[var(--sub)] text-sm py-20 text-center">加载中...</div>;

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-[var(--muted)] hover:text-[var(--fg)] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">邮箱账号管理</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">绑定多个企业邮箱，负载均衡发送</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 h-9 px-4 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] transition">
          <Plus className="w-3.5 h-3.5" /> 添加邮箱
        </button>
      </div>

      {showAdd && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase">邮箱地址</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@qq.com"
                className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase">SMTP服务器</label>
              <input value={form.smtpHost} onChange={e => setForm({...form, smtpHost: e.target.value})}
                className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase">SMTP授权用户</label>
              <input value={form.smtpUser} onChange={e => setForm({...form, smtpUser: e.target.value})} placeholder="通常同邮箱"
                className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase">SMTP授权码</label>
              <input type="password" value={form.smtpPass} onChange={e => setForm({...form, smtpPass: e.target.value})}
                className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)]" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase">每日上限</label>
              <input type="number" value={form.dailyLimit} onChange={e => setForm({...form, dailyLimit: parseInt(e.target.value) || 50})}
                className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] text-center" />
            </div>
          </div>
          <button onClick={handleAdd} className="h-9 px-5 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] transition">确认添加</button>
        </div>
      )}

      <div className="space-y-2">
        {accounts.length === 0 && <p className="text-[13px] text-[var(--sub)] text-center py-10">暂无邮箱账号，点击上方添加</p>}
        {accounts.map(a => (
          <div key={a.id} className="flex items-center justify-between bg-[var(--surface)] rounded-xl border border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-[var(--sub)]" />
              <div>
                <p className="text-[13px] text-[var(--fg)] font-medium">{a.email}</p>
                <p className="text-[11px] text-[var(--sub)]">{a.smtpHost}:{a.smtpPort} · 今日{a.sentToday}/{a.dailyLimit} · 上限{a.dailyLimit}/天</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${a.isActive ? "text-[var(--ok)]" : "text-[var(--sub)]"}`}>{a.isActive ? "启用" : "禁用"}</span>
              <button onClick={() => handleDelete(a.id)} className="p-1.5 text-[var(--sub)] hover:text-[var(--err)] transition"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
