"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function NewCampaignPage() {
  const router = useRouter();
  const { t } = useLang();
  const c = t.campaigns;
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    customerType: "all",
    emailType: "cold_outreach",
    language: "en",
    intervalMin: 10,
    batchSize: 5,
    maxPerDay: 200,
    startHour: null as number | null,
    endHour: null as number | null,
    useTimeZone: true,
  });

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(setCustomers).catch(() => {});
  }, []);

  const overseasCount = customers.filter(c => c.customerType === "overseas").length;
  const domesticCount = customers.filter(c => c.customerType === "domestic").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { alert(c.nameRequired); return; }
    setLoading(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const cam = await res.json();
      router.push(`/campaigns/${cam.id}`);
    } else {
      alert(c.createFailed);
    }
    setLoading(false);
  };

  const f = (key: string) => (form as any)[key];
  const s = (key: string, v: any) => setForm(p => ({ ...p, [key]: v }));

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-[var(--muted)] hover:text-[var(--fg)] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{c.createTitle}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{c.createSubtitle}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
        <div>
          <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.taskName} *</label>
          <input value={f("name")} onChange={e => s("name", e.target.value)} placeholder={c.taskNamePlaceholder}
            className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.targetCustomer}</label>
            <div className="flex gap-2">
              {[
                { v: "all", l: `${c.allType} (${customers.length})` },
                { v: "overseas", l: `${c.overseasType} (${overseasCount})` },
                { v: "domestic", l: `${c.domesticType} (${domesticCount})` },
              ].map(o => (
                <button key={o.v} type="button" onClick={() => s("customerType", o.v)}
                  className={`flex-1 h-10 rounded-xl text-[12px] font-medium transition ${f("customerType") === o.v ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)]"}`}>{o.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.emailType}</label>
            <select value={f("emailType")} onChange={e => s("emailType", e.target.value)}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)]">
              <option value="cold_outreach">{c.typeCold}</option>
              <option value="new_product">{c.typeNewProduct}</option>
              <option value="follow_up">{c.typeFollowUp}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.emailLanguage}</label>
            <select value={f("language")} onChange={e => s("language", e.target.value)}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)]">
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ar">العربية</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.timeZone}</label>
            <select value={f("useTimeZone") ? "1" : "0"} onChange={e => s("useTimeZone", e.target.value === "1")}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)]">
              <option value="1">{c.tzSmart}</option>
              <option value="0">{c.tzNow}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.batchSize}</label>
            <input type="number" value={f("batchSize")} onChange={e => s("batchSize", parseInt(e.target.value) || 5)} min={1} max={50}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] text-center" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.intervalMin}</label>
            <input type="number" value={f("intervalMin")} onChange={e => s("intervalMin", parseInt(e.target.value) || 10)} min={5} max={60}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] text-center" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.maxPerDay}</label>
            <input type="number" value={f("maxPerDay")} onChange={e => s("maxPerDay", parseInt(e.target.value) || 200)} min={10} max={1000}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] text-center" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.sendWindow}</label>
            <select
              value={form.startHour == null ? "all" : String(form.startHour)}
              onChange={e => {
                const v = e.target.value;
                if (v === "all") {
                  s("startHour", null);
                  s("endHour", null);
                } else {
                  s("startHour", parseInt(v));
                  if (form.endHour == null) s("endHour", parseInt(v) + 1 >= 24 ? 23 : parseInt(v) + 1);
                }
              }}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)]"
            >
              <option value="all">{c.windowAllDay}</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{c.windowTo}</label>
            <select
              value={form.endHour == null ? "all" : String(form.endHour)}
              onChange={e => {
                const v = e.target.value;
                if (v === "all") { s("endHour", null); s("startHour", null); }
                else s("endHour", parseInt(v) + 1 >= 24 ? 23 : parseInt(v));
              }}
              className="w-full h-10 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)]"
            >
              <option value="all">{c.windowAllDay}</option>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{i}:00</option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-2">
            <p className="text-[11.5px] text-[var(--sub)] leading-relaxed">
              {form.startHour == null || form.endHour == null
                ? c.windowAllDayDesc
                : `${c.windowActive} ${form.startHour}:00 - ${form.endHour}:00`}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {c.creating}</> : <><Send className="w-4 h-4" /> {c.createAndGenerate}</>}
          </button>
          <Link href="/campaigns" className="inline-flex items-center h-10 px-5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[13px] rounded-full hover:bg-[var(--surface3)]">{c.cancel}</Link>
        </div>
      </form>
    </div>
  );
}
