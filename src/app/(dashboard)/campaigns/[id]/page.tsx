"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Send, Eye, MousePointer, AlertTriangle, Ban, Trash2, Loader2 } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLang();
  const c = t.campaigns;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`).then(r => r.json()).then(d => { setCampaign(d); setLoading(false); });
  }, [params.id]);

  const handleSend = async () => {
    setSending(true);
    const res = await fetch(`/api/campaigns/${params.id}/send`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setCampaign((p: any) => ({ ...p, status: "running", totalSent: (p?.totalSent || 0) + data.sent }));
      if (data.stopped === "window") alert(c.windowBlocked);
      else if (data.stopped === "limit") alert(c.dailyLimitReached);
    } else if (data.error === "no_valid_recipients") {
      alert(
        c.noRecipients
          .replace("{total}", String(data.detail?.totalCustomers ?? 0))
          .replace("{withEmail}", String(data.detail?.withEmail ?? 0))
          .replace("{blocked}", String(data.detail?.blocked ?? 0))
          .replace("{platform}", String(data.detail?.platform ?? 0))
      );
    } else alert(data.error || t.campaigns.failed);
    setSending(false);
  };

  const handleDelete = async () => {
    if (!confirm(t.campaigns.confirmDeleteTask)) return;
    await fetch(`/api/campaigns/${params.id}`, { method: "DELETE" });
    router.push("/campaigns");
  };

  if (loading) return <div className="text-[var(--sub)] text-sm py-20 text-center">{t.campaigns.loading}</div>;
  if (!campaign) return <div className="text-[var(--sub)] text-sm py-20 text-center">{t.campaigns.notFound}</div>;

  const typeLabel: Record<string, string> = { cold_outreach: c.typeCold, new_product: c.typeNewProduct, follow_up: c.typeFollowUp };
  const openRate = campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : "0";
  const customerTypeLabel = campaign.customerType === "all" ? c.allCustomers : campaign.customerType === "overseas" ? c.overseasCustomers : c.domesticCustomers;

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-[var(--muted)] hover:text-[var(--fg)] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{campaign.name}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{typeLabel[campaign.emailType]} · {campaign.language?.toUpperCase()} · {customerTypeLabel}</p>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={handleSend} disabled={sending}
              className="inline-flex items-center gap-2 h-9 px-4 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition">
              {sending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.campaigns.sending}</> : <><Play className="w-3.5 h-3.5" /> {t.campaigns.startSend}</>}
            </button>
          )}
          <button onClick={handleDelete} className="p-2 rounded-lg text-[var(--sub)] hover:text-[var(--err)] transition"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { v: campaign.totalSent, l: t.campaigns.sent, i: Send, cl: "text-[var(--fg)]" },
          { v: `${openRate}%`, l: t.campaigns.openRate, i: Eye, cl: "text-[var(--ok)]" },
          { v: campaign.totalClicked, l: t.campaigns.click, i: MousePointer, cl: "text-[var(--info)]" },
          { v: campaign.totalBounced, l: t.campaigns.bounced, i: AlertTriangle, cl: "text-[var(--err)]" },
          { v: campaign.totalReplied, l: t.campaigns.replied, i: Send, cl: "text-[var(--ok)]" },
          { v: campaign.totalUnsub, l: t.campaigns.unsub, i: Ban, cl: "text-[var(--warn)]" },
        ].map(s => (
          <div key={s.l} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <s.i className={`w-4 h-4 ${s.cl} mb-1`} />
            <p className={`text-[22px] font-bold ${s.cl}`}>{s.v}</p>
            <p className="text-[11px] text-[var(--sub)]">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
        <div className="grid grid-cols-2 gap-6 text-[12px]">
          <div><span className="text-[var(--sub)]">{t.campaigns.batchSize}</span><p className="text-[var(--fg)] font-semibold">{campaign.batchSize}{t.campaigns.unitEmail}</p></div>
          <div><span className="text-[var(--sub)]">{t.campaigns.sendInterval}</span><p className="text-[var(--fg)] font-semibold">{campaign.intervalMin}{t.campaigns.unitMin}</p></div>
          <div><span className="text-[var(--sub)]">{t.campaigns.maxPerDay}</span><p className="text-[var(--fg)] font-semibold">{campaign.maxPerDay}{t.campaigns.unitEmail}</p></div>
          <div><span className="text-[var(--sub)]">{t.campaigns.timeZone}</span><p className="text-[var(--fg)] font-semibold">{campaign.useTimeZone ? t.campaigns.tzMatching : t.campaigns.tzNowShort}</p></div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">{t.campaigns.recipients}</h3>
          <span className="text-[11px] text-[var(--sub)]">{(campaign.recipients || []).length}</span>
        </div>
        {(campaign.recipients || []).length === 0 ? (
          <p className="text-[12px] text-[var(--sub)] py-8 text-center">{t.campaigns.noRecipientsList}</p>
        ) : (
          <ul className="divide-y divide-[var(--surface2)] max-h-96 overflow-y-auto">
            {(campaign.recipients || []).map((r: any) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.channel === "tradewheel" ? "bg-[var(--warnbg)] text-[var(--warn)]" : "bg-[var(--infobg)] text-[var(--info)]"}`}>
                  {r.channel === "tradewheel" ? t.campaigns.channelTradewheel : t.campaigns.channelEmail}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] text-[var(--fg)] truncate">{r.customerName || r.email}</p>
                  <p className="text-[10.5px] text-[var(--sub)] truncate">{r.channel === "tradewheel" ? r.threadUrl : r.email}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-medium ${r.status === "sent" ? "text-[var(--ok)]" : r.status === "bounced" ? "text-[var(--err)]" : "text-[var(--sub)]"}`}>
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {campaign.emailSubject && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">{t.campaigns.preview}</h3>
          <p className="text-[14px] font-medium text-[var(--fg)] mb-2">{campaign.emailSubject}</p>
          <pre className="text-[12px] text-[var(--muted)] whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto bg-[var(--surface2)] rounded-xl p-4">{campaign.emailBody?.substring(0, 2000)}{(campaign.emailBody?.length || 0) > 2000 ? "..." : ""}</pre>
        </div>
      )}
    </div>
  );
}