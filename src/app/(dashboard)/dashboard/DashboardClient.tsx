"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Building2, Package, Users, ShoppingCart,
  Search, ChevronLeft, ChevronRight,
  Upload, Download, Radio, RefreshCw,
} from "lucide-react";
import { useLang } from "@/i18n/LangContext";

interface DashboardClientProps {
  userName: string;
  vendorCount: number;
  productCount: number;
  customerCount: number;
  orderCount: number;
  recentOrders: any[];
  ordersGrouped: { name: string; value: number }[];
  orderStatusData: { name: string; value: number; color: string }[];
  vendorChange: string;
  productChange: string;
  customerChange: string;
  orderChange: string;
}

interface SummaryData {
  vendorCount: number;
  productCount: number;
  customerCount: number;
  orderCount: number;
  vendorChange: string;
  productChange: string;
  customerChange: string;
  orderChange: string;
  trend: { labels: string[]; closed: number[]; negotiating: number[] };
  orderStatus: { delivered: number; processing: number; pending: number };
  recentOrders: any[];
}

const PAGE_SIZE = 8;
const RING = "bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5";
const BTN = "inline-flex items-center gap-1.5 h-9 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[12px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition";
const BTNW = "inline-flex items-center gap-1.5 h-9 px-4 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]";
const LINK = "text-[var(--fg)] hover:underline";

const TW = 600;
const TH = 240;
const TBOTTOM = 22;

function buildPath(vals: number[]): string {
  const max = Math.max(...vals, 1);
  const step = (TW - 20) / Math.max(vals.length - 1, 1);
  return vals
    .map((v, i) => {
      const x = 10 + i * step;
      const y = TH - TBOTTOM - (v / max) * (TH - TBOTTOM - 12);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function dotsFor(vals: number[]): { x: number; y: number; visible: boolean }[] {
  const max = Math.max(...vals, 1);
  const step = (TW - 20) / Math.max(vals.length - 1, 1);
  return vals.map((v, i) => {
    const x = 10 + i * step;
    const y = TH - TBOTTOM - (v / max) * (TH - TBOTTOM - 12);
    return { x, y, visible: v > 0 };
  });
}

export default function DashboardClient({
  vendorCount, productCount, customerCount, orderCount,
  recentOrders,
  vendorChange, productChange, customerChange, orderChange,
}: DashboardClientProps) {
  const { lang, t } = useLang();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [triggering, setTriggering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [data, setData] = useState<SummaryData>({
    vendorCount,
    productCount,
    customerCount,
    orderCount,
    vendorChange,
    productChange,
    customerChange,
    orderChange,
    trend: { labels: [], closed: [], negotiating: [] },
    orderStatus: { delivered: 0, processing: 0, pending: 0 },
    recentOrders,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) return;
      const d = await res.json();
      setData(d);
      setUpdatedAt(new Date());
    } catch {
      // 网络异常时保留旧数据
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    timerRef.current = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const handleTrigger = useCallback(async () => {
    setTriggering(true);
    try {
      const response = await fetch("/api/customers/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "采集失败");
      window.alert(`已采集 ${resData.createdCount || 0} 条真实海外客户线索`);
      load(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "客户采集失败");
    } finally {
      setTriggering(false);
    }
  }, [load]);

  const filtered = data.recentOrders.filter((o) => {
    if (search && !o.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = [
    { title: t.dashboard.partners, value: data.vendorCount, change: data.vendorChange, icon: Building2, href: "/vendors" },
    { title: t.dashboard.totalProducts, value: data.productCount, change: data.productChange, icon: Package, href: "/products" },
    { title: t.dashboard.leads, value: data.customerCount, change: data.customerChange, icon: Users, href: "/customers" },
    { title: t.dashboard.monthlyOrders, value: data.orderCount, change: data.orderChange, icon: ShoppingCart, href: "/orders" },
  ];

  const closed = data.orderStatus.delivered;
  const negotiating = data.orderStatus.processing;
  const pending = data.orderStatus.pending;
  const ringTotal = Math.max(1, closed + negotiating + pending);
  const C = 2 * Math.PI * 70;
  const segClosed = (closed / ringTotal) * C;
  const segNeg = (negotiating / ringTotal) * C;
  const segPending = (pending / ringTotal) * C;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.dashboard.title}</h1>
          <p className="text-[12px] text-[var(--sub)] mt-0.5">
            {t.dashboard.subtitle}
            {updatedAt && (
              <span className="ml-2">· {updatedAt.toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="inline-flex items-center justify-center w-9 h-9 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition"
            aria-label="refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link href="/batch-upload" className={BTN}><Upload className="w-3.5 h-3.5" />{t.dashboard.batchUpload}</Link>
          <a href="/api/export/all" className={BTN}><Download className="w-3.5 h-3.5" />{t.dashboard.exportAll}</a>
          <button onClick={handleTrigger} disabled={triggering} className={BTNW}>
            <Radio className={`w-3.5 h-3.5 ${triggering ? "animate-spin" : ""}`} />
            {triggering ? t.dashboard.crawling : t.dashboard.oneClickCrawl}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.href} href={card.href} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 hover:border-[#444] hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{card.title}</p>
                <p className="text-[26px] font-bold text-[var(--fg)] mt-1.5 tracking-tight">{card.value}</p>
                <p className={`text-[12px] font-medium mt-1 ${card.change.startsWith("+") ? "text-[var(--ok)]" : "text-[var(--sub)]"}`}>
                  {card.change} <span className="text-[var(--sub)] font-normal">{t.dashboard.previousMonth}</span>
                </p>
              </div>
              <card.icon className="w-5 h-5 text-[var(--fg)]/20 group-hover:text-[var(--fg)] transition" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={RING}>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">{t.dashboard.monthlyOrderTrend}</h3>
          <p className="text-[11px] text-[var(--sub)] mb-4">{t.dashboard.trendSubtitle}</p>
          <div style={{ height: 260 }}>
            {data.trend.closed.length > 0 ? (
              <svg viewBox={`0 0 ${TW} ${TH}`} className="w-full h-full" preserveAspectRatio="none">
                <path d={buildPath(data.trend.closed)} fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round" />
                <path d={buildPath(data.trend.negotiating)} fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round" strokeDasharray="6,3" />
                {dotsFor(data.trend.closed).map((d, i) => d.visible && (
                  <rect key={i} x={d.x - 4} y={d.y - 4} width="8" height="8" rx="4" fill="#fff" />
                ))}
                {dotsFor(data.trend.negotiating).map((d, i) => d.visible && (
                  <rect key={`n${i}`} x={d.x - 3} y={d.y - 3} width="6" height="6" rx="3" fill="#fff" />
                ))}
                <line x1="0" y1={TH - TBOTTOM} x2={TW} y2={TH - TBOTTOM} stroke="var(--border)" strokeWidth="1" />
                {[1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={TH - TBOTTOM - (i * (TH - TBOTTOM - 12)) / 4} x2={TW} y2={TH - TBOTTOM - (i * (TH - TBOTTOM - 12)) / 4} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
                ))}
                {data.trend.labels.map((lb, i) => {
                  const step = (TW - 20) / Math.max(data.trend.labels.length - 1, 1);
                  const x = 10 + i * step;
                  return (
                    <text key={i} x={x} y={TH - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{lb}</text>
                  );
                })}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-[var(--sub)]">{t.dashboard.noOrders}</div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-[var(--muted)]"><span className="w-3 h-0.5 rounded-full bg-[var(--ok)] inline-block" /> {t.dashboard.closed}</span>
            <span className="flex items-center gap-1.5 text-[var(--muted)]"><span className="w-3 h-0.5 rounded-full bg-[#ff3b30] inline-block" /> {t.dashboard.negotiating}</span>
          </div>
        </div>

        <div className={RING}>
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">{t.dashboard.orderStatusRing}</h3>
          <p className="text-[11px] text-[var(--sub)] mb-4">{t.dashboard.ringSubtitle}</p>
          <div className="flex items-center gap-8 flex-wrap">
            <div className="relative w-[180px] h-[180px] flex-shrink-0">
              <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                <circle cx="90" cy="90" r="70" fill="none" stroke="var(--border)" strokeWidth="16" />
                {closed > 0 && (
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#30d158" strokeWidth="16" strokeDasharray={`${segClosed} ${C}`} strokeDashoffset="0" strokeLinecap="round" />
                )}
                {negotiating > 0 && (
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#ff3b30" strokeWidth="16" strokeDasharray={`${segNeg} ${C}`} strokeDashoffset={`-${segClosed}`} strokeLinecap="round" />
                )}
                {pending > 0 && (
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#0071e3" strokeWidth="16" strokeDasharray={`${segPending} ${C}`} strokeDashoffset={`-${segClosed + segNeg}`} strokeLinecap="round" />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[22px] font-bold text-[var(--fg)]">{data.orderCount}</p>
                  <p className="text-[10px] text-[var(--sub)]">{t.dashboard.monthlyOrders}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-[12px] flex-1 min-w-[140px]">
              <button onClick={() => setStatusFilter("delivered")} className="flex items-center justify-between w-full hover:bg-[var(--surface2)] rounded-lg px-2 py-1.5 transition">
                <span className="flex items-center gap-2 text-[var(--muted)]"><span className="w-3 h-3 rounded-full bg-[var(--ok)]" /> {t.dashboard.closed}</span>
                <span className="text-[var(--fg)] font-semibold">{closed}</span>
              </button>
              <button onClick={() => setStatusFilter("processing")} className="flex items-center justify-between w-full hover:bg-[var(--surface2)] rounded-lg px-2 py-1.5 transition">
                <span className="flex items-center gap-2 text-[var(--muted)]"><span className="w-3 h-3 rounded-full bg-[#ff3b30]" /> {t.dashboard.negotiating}</span>
                <span className="text-[var(--fg)] font-semibold">{negotiating}</span>
              </button>
              <button onClick={() => setStatusFilter("pending")} className="flex items-center justify-between w-full hover:bg-[var(--surface2)] rounded-lg px-2 py-1.5 transition">
                <span className="flex items-center gap-2 text-[var(--muted)]"><span className="w-3 h-3 rounded-full bg-[#0071e3]" /> {t.dashboard.overseasLeads}</span>
                <span className="text-[var(--fg)] font-semibold">{pending}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sub)]" strokeWidth={1.5} />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t.dashboard.searchOrder}
              className="w-full h-8 pl-8 pr-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-8 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--muted)] focus:outline-none focus:border-[var(--sub)]">
            <option value="">{t.dashboard.allStatus}</option><option value="pending">{t.dashboard.overseasLeads}</option><option value="processing">{t.dashboard.negotiating}</option><option value="delivered">{t.dashboard.closed}</option>
          </select>
          <span className="text-[11px] text-[var(--sub)] ml-auto">{filtered.length} {t.dashboard.records}</span>
        </div>

        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Radio className="w-10 h-10 text-[#333] mb-4" strokeWidth={1} />
            <p className="text-[14px] text-[var(--sub)]">{t.dashboard.noOrders}</p>
            <p className="text-[12px] text-[#444] mt-2 mb-4">{t.dashboard.noOrdersHint}</p>
            <button onClick={handleTrigger} disabled={triggering} className={BTNW}>
              <Radio className={`w-4 h-4 ${triggering ? "animate-spin" : ""}`} />
              {triggering ? t.dashboard.crawling : t.dashboard.crawlCustomers}
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[var(--sub)]">
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{t.dashboard.orderNumber}</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{t.dashboard.vendor}</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{t.dashboard.amount}</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{t.dashboard.status}</th>
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{t.dashboard.date}</th>
              </tr></thead>
              <tbody className="divide-y divide-[var(--surface2)]">
                {paged.map((o) => (
                  <tr key={o.id} className="hover:bg-[var(--surface2)]/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-[12px] text-[var(--muted)]">{o.orderNumber}</td>
                    <td className="px-5 py-3 text-[13px] font-medium text-[var(--fg)]">{o.vendor?.name || t.dashboard.autoVendor}</td>
                    <td className="px-5 py-3 text-[13px] text-[var(--fg)]">¥{Number(o.totalAmount).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        o.status === "delivered" ? "bg-[var(--okbg)] text-[var(--ok)]" : o.status === "processing" ? "bg-[var(--errbg)] text-[#ff3b30]" : "bg-[var(--infobg)] text-[#0071e3]"
                      }`}>{o.status === "delivered" ? t.dashboard.closed : o.status === "processing" ? t.dashboard.negotiating : t.dashboard.overseasLeads}</span>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[var(--sub)]">{new Date(o.createdAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
              <span className="text-[11px] text-[var(--sub)]">{t.dashboard.page}{page}{t.dashboard.of}{totalPages}{t.dashboard.pages}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--fg)] disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPage(n)} className={`w-7 h-7 rounded-lg text-[12px] font-medium transition ${n === page ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--fg)]"}`}>{n}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--fg)] disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
