"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Play, Pause, BarChart3, Trash2, Send, Clock, CheckCircle, Loader2, Pencil } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import BatchDeleteBar from "@/components/dashboard/BatchDeleteBar";
import { Button } from "@/components/ui/Card";

export default function CampaignsClient({ campaigns: initial }: { campaigns: any[] }) {
  const { t } = useLang();
  const [campaigns, setCampaigns] = useState(initial);
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const c = t.campaigns;

  const typeLabel: Record<string, string> = {
    cold_outreach: c.typeCold,
    new_product: c.typeNewProduct,
    follow_up: c.typeFollowUp,
  };

  const statusColor: Record<string, string> = {
    draft: "bg-[var(--surface2)] text-[var(--muted)]",
    running: "bg-[var(--okbg)] text-[var(--ok)]",
    paused: "bg-[var(--warnbg)] text-[var(--warn)]",
    completed: "bg-[var(--infobg)] text-[var(--info)]",
    cancelled: "bg-[var(--errbg)] text-[var(--err)]",
  };

  const statusLabel: Record<string, string> = {
    draft: c.statusDraft,
    running: c.statusRunning,
    paused: c.statusPaused,
    completed: c.statusCompleted,
    cancelled: c.statusCancelled,
  };

  const handleDelete = async (id: string) => {
    if (!confirm(c.confirmDelete)) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((p) => p.filter((c) => c.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelected(new Set());
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定批量删除选中的 ${selected.size} 个营销任务？此操作不可撤销`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        const ids = new Set(selected);
        setCampaigns((prev) => prev.filter((c) => !ids.has(c.id)));
        setSelected(new Set());
      } else {
        alert(data.error || c.startFailed);
      }
    } catch {
      alert(c.networkError);
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleSend = async (id: string) => {
    setSending((p) => new Set(p).add(id));
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCampaigns((p) =>
          p.map((c) => (c.id === id ? { ...c, status: "running", totalSent: data.sent } : c))
        );
        if (data.stopped === "window") alert(c.windowBlocked);
        else if (data.stopped === "limit") alert(c.dailyLimitReached);
      } else if (data.error === "no_valid_recipients") {
        alert(
          c.noRecipients
            .replace("{total}", String(data.detail?.totalCustomers ?? 0))
            .replace("{withEmail}", String(data.detail?.withEmail ?? 0))
        );
      } else {
        alert(data.error || c.startFailed);
      }
    } catch {
      alert(c.networkError);
    } finally {
      setSending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{c.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{c.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={editMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
          >
            <Pencil className="w-3.5 h-3.5" /> {editMode ? "完成" : "编辑"}
          </Button>
          <Link href="/campaigns/analytics" className="inline-flex items-center gap-2 h-9 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[12px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition">
            <BarChart3 className="w-3.5 h-3.5" /> {c.analytics}
          </Link>
          <Link href="/campaigns/new" className="inline-flex items-center gap-2 h-9 px-4 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]">
            <Plus className="w-3.5 h-3.5" /> {c.newCampaign}
          </Link>
        </div>
      </div>

      {editMode && (
        <BatchDeleteBar
          selectedCount={selected.size}
          onDelete={handleBatchDelete}
          deleting={batchDeleting}
          onClear={() => setSelected(new Set())}
          onDone={exitEditMode}
        />
      )}

      {campaigns.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
          <Send className="w-10 h-10 text-[#333] mx-auto mb-4" />
          <p className="text-[14px] text-[var(--sub)]">{c.empty}</p>
          <p className="text-[12px] text-[#444] mt-2 mb-4">{c.emptyDesc}</p>
          <Link href="/campaigns/new" className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] transition">
            <Plus className="w-4 h-4" /> {c.newTask}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const isSelected = selected.has(c.id);
            return (
            <div
              key={c.id}
              onClick={editMode ? () => toggleSelect(c.id) : undefined}
              className={`bg-[var(--surface)] rounded-2xl border p-5 transition ${
                editMode ? "cursor-pointer [&_a]:pointer-events-none [&_button]:pointer-events-none" : "hover:border-[var(--sub)]"
              } ${isSelected ? "border-[#ff453a] bg-[var(--errbg)]" : "border-[var(--border)]"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/campaigns/${c.id}`} className="text-[15px] font-semibold text-[var(--fg)] hover:underline">{c.name}</Link>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor[c.status] || ""}`}>
                    {statusLabel[c.status] || c.status}
                  </span>
                  <span className="text-[11px] text-[var(--sub)]">{typeLabel[c.emailType]}</span>
                  <span className="text-[11px] text-[var(--sub)] uppercase">{c.language}</span>
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "draft" && (
                    <button onClick={() => handleSend(c.id)} disabled={sending.has(c.id)}
                      className="p-2 rounded-lg text-[var(--ok)] hover:bg-[var(--okbg)] transition disabled:opacity-40" title={t.campaigns.startSend}>
                      {sending.has(c.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => handleDelete(c.id)}
                    className="p-2 rounded-lg text-[var(--sub)] hover:text-[var(--err)] hover:bg-[var(--surface2)] transition" title={t.campaigns.del}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4 mt-3 text-[12px]">
                <div><span className="text-[var(--sub)]">{t.campaigns.sent}</span><p className="text-[var(--fg)] font-semibold">{c.totalSent || 0}</p></div>
                <div><span className="text-[var(--sub)]">{t.campaigns.opened}</span><p className="text-[var(--ok)] font-semibold">{c.totalOpened || 0}</p></div>
                <div><span className="text-[var(--sub)]">{t.campaigns.clicked}</span><p className="text-[var(--info)] font-semibold">{c.totalClicked || 0}</p></div>
                <div><span className="text-[var(--sub)]">{t.campaigns.bounced}</span><p className="text-[var(--err)] font-semibold">{c.totalBounced || 0}</p></div>
                <div><span className="text-[var(--sub)]">{t.campaigns.replied}</span><p className="text-[var(--ok)] font-semibold">{c.totalReplied || 0}</p></div>
                <div><span className="text-[var(--sub)]">{t.campaigns.unsub}</span><p className="text-[var(--warn)] font-semibold">{c.totalUnsub || 0}</p></div>
              </div>

              <div className="flex items-center gap-3 mt-3 text-[11px] text-[var(--sub)]">
                <span>{t.campaigns.batch}: {c.batchSize}{t.campaigns.unitEmail}/{c.intervalMin}{t.campaigns.unitMin}</span>
                <span>{t.campaigns.dailyLimit}: {c.maxPerDay}{t.campaigns.unitEmail}</span>
                {c.nextRunAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.campaigns.nextRun}: {new Date(c.nextRunAt).toLocaleString()}</span>}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
