"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Mail, Eye, MousePointer, AlertTriangle, Ban } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function CampaignAnalyticsPage() {
  const { t } = useLang();
  const c = t.campaigns;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns").then(r => r.json()).then(d => { setCampaigns(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-[var(--sub)] text-sm py-20 text-center">{t.campaigns.loading}</div>;

  const total = campaigns.reduce((a, b) => a + b.totalSent, 0);
  const opened = campaigns.reduce((a, b) => a + b.totalOpened, 0);
  const clicked = campaigns.reduce((a, b) => a + b.totalClicked, 0);
  const bounced = campaigns.reduce((a, b) => a + b.totalBounced, 0);
  const unsub = campaigns.reduce((a, b) => a + b.totalUnsub, 0);
  const replies = campaigns.reduce((a, b) => a + b.totalReplied, 0);

  const openRate = total > 0 ? ((opened / total) * 100).toFixed(1) : "0";
  const clickRate = total > 0 ? ((clicked / total) * 100).toFixed(1) : "0";
  const bounceRate = total > 0 ? ((bounced / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-[var(--muted)] hover:text-[var(--fg)] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.campaigns.analyticsTitle}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.campaigns.analyticsSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t.campaigns.totalSent, value: total, icon: Mail, color: "text-[var(--fg)]" },
          { label: t.campaigns.openRate, value: `${openRate}%`, icon: Eye, color: "text-[var(--ok)]" },
          { label: t.campaigns.clickRate, value: `${clickRate}%`, icon: MousePointer, color: "text-[var(--info)]" },
          { label: t.campaigns.bounceRate, value: `${bounceRate}%`, icon: AlertTriangle, color: "text-[var(--err)]" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-[26px] font-bold mt-1.5 tracking-tight ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">{t.campaigns.perTaskCompare}</h3>
          {campaigns.length === 0 ? (
            <p className="text-[13px] text-[var(--sub)] text-center py-10">{t.campaigns.noData}</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((cam) => {
                const rate = cam.totalSent > 0 ? ((cam.totalOpened / cam.totalSent) * 100).toFixed(0) : 0;
                return (
                  <div key={cam.id}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-[var(--muted)] truncate mr-2">{cam.name}</span>
                      <span className="text-[var(--fg)]">{cam.totalSent}{t.campaigns.unitEmail} · {rate}%</span>
                    </div>
                    <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--ok)] rounded-full transition-all" style={{ width: `${Math.min(Number(rate), 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">{t.campaigns.intentLayer}</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-[var(--ok)]">{t.campaigns.highIntent}</span>
                <span className="text-[var(--fg)] font-semibold">{clicked}</span>
              </div>
              <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--ok)] rounded-full" style={{ width: `${total > 0 ? (clicked/total)*100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-[var(--warn)]">{t.campaigns.midIntent}</span>
                <span className="text-[var(--fg)] font-semibold">{Math.max(0, opened - clicked)}</span>
              </div>
              <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--warn)] rounded-full" style={{ width: `${total > 0 ? ((opened-clicked)/total)*100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-[var(--sub)]">{t.campaigns.lowIntent}</span>
                <span className="text-[var(--fg)] font-semibold">{total - opened - bounced}</span>
              </div>
              <div className="h-2 bg-[var(--surface2)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--sub)] rounded-full" style={{ width: `${total > 0 ? ((total-opened-bounced)/total)*100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}