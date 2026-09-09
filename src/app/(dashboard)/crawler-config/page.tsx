"use client";

import { useState, useEffect } from "react";
import { Radio, Settings, Check, Globe, Ghost, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/i18n/LangContext";

const PLATFORMS = [
  { id: "1688", label: "阿里巴巴 1688" },
  { id: "hc360", label: "慧聪网" },
  { id: "made-in-china", label: "中国制造网" },
  { id: "global-sources", label: "Global Sources" },
  { id: "exportersindia", label: "ExportersIndia" },
];
const BUYER_PLATFORMS = [
  { id: "tradewheel", label: "TradeWheel" },
  { id: "exportersindia", label: "ExportersIndia" },
];
const HEADLESS_BROWSERS = [
  { id: "chrome", label: "Google Chrome" },
  { id: "edge", label: "Microsoft Edge" },
  { id: "firefox", label: "Mozilla Firefox" },
];
const COUNTRY_OPTIONS = [
  { id: "Germany", zh: "德国", en: "Germany" },
  { id: "USA", zh: "美国", en: "USA" },
  { id: "Mexico", zh: "墨西哥", en: "Mexico" },
  { id: "Brazil", zh: "巴西", en: "Brazil" },
  { id: "UAE", zh: "阿联酋", en: "UAE" },
  { id: "Japan", zh: "日本", en: "Japan" },
  { id: "Korea", zh: "韩国", en: "Korea" },
  { id: "India", zh: "印度", en: "India" },
  { id: "Vietnam", zh: "越南", en: "Vietnam" },
  { id: "Australia", zh: "澳大利亚", en: "Australia" },
  { id: "UK", zh: "英国", en: "UK" },
  { id: "France", zh: "法国", en: "France" },
  { id: "Canada", zh: "加拿大", en: "Canada" },
];

export default function CrawlerConfigPage() {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [vendorSources, setVendorSources] = useState<string[]>([]);
  const [vendorPages, setVendorPages] = useState(1);
  const [requestDelayMs, setRequestDelayMs] = useState(1200);
  const [crawlMode, setCrawlMode] = useState<"http" | "headless">("http");
  const [headlessBrowsers, setHeadlessBrowsers] = useState<string[]>(["edge"]);
  const [crawlInterval, setCrawlInterval] = useState("daily");
  const [customerSources, setCustomerSources] = useState<string[]>([]);
  const [targetCountries, setTargetCountries] = useState<string[]>(["Germany", "USA"]);
  const [marketMode, setMarketMode] = useState<"domestic" | "overseas" | "global">("global");
  const [autoMarketing, setAutoMarketing] = useState(false);
  const [autoCampaignId, setAutoCampaignId] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderSmtpHost, setSenderSmtpHost] = useState("");
  const [senderSmtpPort, setSenderSmtpPort] = useState(465);
  const [senderSmtpPass, setSenderSmtpPass] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [themeLight, setThemeLight] = useState(false);

  useEffect(() => {
    try {
      setThemeLight(document.documentElement.classList.contains("theme-light"));
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !themeLight;
    setThemeLight(next);
    try {
      document.documentElement.classList.toggle("theme-light", next);
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {}
  };

  useEffect(() => {
    fetch("/api/crawler-config")
      .then(r => r.json())
      .then(d => {
        if (d.vendorSources) setVendorSources(JSON.parse(d.vendorSources));
        if (d.vendorPages) setVendorPages(Number(d.vendorPages));
        if (d.requestDelayMs) setRequestDelayMs(Number(d.requestDelayMs));
        if (d.crawlMode === "headless") setCrawlMode("headless");
        if (d.headlessBrowsers) setHeadlessBrowsers(JSON.parse(d.headlessBrowsers));
        if (d.crawlInterval) setCrawlInterval(d.crawlInterval);
        if (d.customerSources) setCustomerSources(JSON.parse(d.customerSources));
        if (d.targetCountries) setTargetCountries(String(d.targetCountries).split(",").map((c) => c.trim()).filter(Boolean));
        if (d.marketMode === "domestic" || d.marketMode === "overseas") setMarketMode(d.marketMode);
        if (d.autoMarketing) setAutoMarketing(true);
        if (d.autoCampaignId) setAutoCampaignId(d.autoCampaignId);
        if (d.senderEmail) setSenderEmail(d.senderEmail);
        if (d.senderSmtpHost) setSenderSmtpHost(d.senderSmtpHost);
        if (d.senderSmtpPort) setSenderSmtpPort(Number(d.senderSmtpPort));
        if (d.senderSmtpPass) setSenderSmtpPass(d.senderSmtpPass);
      })
      .finally(() => setLoading(false));
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCampaigns(d); })
      .catch(() => {});
  }, []);

  const toggleSource = (s: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(s)) setter(list.filter(x => x !== s));
    else setter([...list, s]);
  };

  const handleSave = async () => {
    setSaveError("");
    const response = await fetch("/api/crawler-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorSources: JSON.stringify(vendorSources),
        vendorPages,
        requestDelayMs,
        crawlMode,
        headlessBrowsers: JSON.stringify(headlessBrowsers),
        crawlInterval,
        customerSources: JSON.stringify(customerSources),
        targetCountries: targetCountries.join(","),
        marketMode,
        autoMarketing,
        autoCampaignId: autoCampaignId || null,
        senderEmail: senderEmail.trim() || null,
        senderSmtpHost: senderSmtpHost.trim() || null,
        senderSmtpPort: senderSmtpPort || null,
        senderSmtpPass: senderSmtpPass || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaveError(data.error || "配置保存失败");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return null;

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.crawler.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.crawler.desc}</p>
        </div>
        <button
          onClick={toggleTheme}
          className={`shrink-0 flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
            themeLight
              ? "border-[#0071e3] bg-[#0071e3]/10 text-[#0071e3]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--surface3)] hover:text-[var(--fg)]"
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              themeLight ? "border-[#0071e3]" : "border-[var(--sub)]"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${themeLight ? "bg-[#0071e3]" : "bg-[var(--sub)]"}`} />
          </span>
          {themeLight ? t.crawler.themeLight : t.crawler.themeDark}
        </button>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">{t.crawler.crawlMode}</h3>
        <p className="text-[12px] text-[var(--muted)] mb-4">{t.crawler.crawlModeDesc}</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setCrawlMode("http")}
            className={`text-left rounded-2xl border p-4 transition ${crawlMode === "http" ? "border-[var(--fg)] bg-[var(--surface2)]" : "border-[var(--border)] bg-[var(--surface2)]/50 hover:border-[var(--sub)]"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className={`w-4 h-4 ${crawlMode === "http" ? "text-[var(--fg)]" : "text-[var(--sub)]"}`} />
              <span className={`text-[13px] font-semibold ${crawlMode === "http" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}>{t.crawler.modeHttp}</span>
              {crawlMode === "http" && <span className="ml-auto w-2 h-2 rounded-full bg-white" />}
            </div>
            <p className="text-[11px] text-[var(--sub)] leading-relaxed">{t.crawler.modeHttpDesc}</p>
          </button>
          <button
            onClick={() => setCrawlMode("headless")}
            className={`text-left rounded-2xl border p-4 transition ${crawlMode === "headless" ? "border-[var(--fg)] bg-[var(--surface2)]" : "border-[var(--border)] bg-[var(--surface2)]/50 hover:border-[var(--sub)]"}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Ghost className={`w-4 h-4 ${crawlMode === "headless" ? "text-[var(--fg)]" : "text-[var(--sub)]"}`} />
              <span className={`text-[13px] font-semibold ${crawlMode === "headless" ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}>{t.crawler.modeHeadless}</span>
              {crawlMode === "headless" && <span className="ml-auto w-2 h-2 rounded-full bg-white" />}
            </div>
            <p className="text-[11px] text-[var(--sub)] leading-relaxed">{t.crawler.modeHeadlessDesc}</p>
          </button>
        </div>
        {crawlMode === "headless" && (
          <p className="mt-3 text-[12px] text-[#f5a623] flex items-center gap-1.5">
            <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" /> {t.crawler.modeExclusive}
          </p>
        )}
        {crawlMode === "headless" && (
          <div className="mt-4">
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.headlessBrowsers}</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {HEADLESS_BROWSERS.map((browser) => (
                <label key={browser.id} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={headlessBrowsers.includes(browser.id)}
                    onChange={() => toggleSource(browser.id, headlessBrowsers, setHeadlessBrowsers)}
                    className="accent-white"
                  />
                  {browser.label}
                </label>
              ))}
            </div>
            {headlessBrowsers.length === 0 && (
              <p className="text-[11px] text-[#f5a623] mt-1.5">{t.crawler.headlessBrowsersEmpty}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">{t.crawler.marketMode}</h3>
        <p className="text-[12px] text-[var(--muted)] mb-4">{t.crawler.marketModeDesc}</p>
        <div className="grid grid-cols-3 gap-4">
          {([
            { id: "domestic", label: t.crawler.modeDomestic, desc: t.crawler.modeDomesticDesc },
            { id: "overseas", label: t.crawler.modeOverseas, desc: t.crawler.modeOverseasDesc },
            { id: "global", label: t.crawler.modeGlobal, desc: t.crawler.modeGlobalDesc },
          ] as const).map((option) => (
            <button
              key={option.id}
              onClick={() => setMarketMode(option.id)}
              className={`text-left rounded-2xl border p-4 transition ${marketMode === option.id ? "border-[var(--fg)] bg-[var(--surface2)]" : "border-[var(--border)] bg-[var(--surface2)]/50 hover:border-[var(--sub)]"}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[13px] font-semibold ${marketMode === option.id ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}>{option.label}</span>
                {marketMode === option.id && <span className="ml-auto w-2 h-2 rounded-full bg-white" />}
              </div>
              <p className="text-[11px] text-[var(--sub)] leading-relaxed">{option.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--fg)]">{t.crawler.vendorSources}</h3>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.fetchPlatforms}</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {PLATFORMS.map((source) => (
                <label key={source.id} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={vendorSources.includes(source.id)} onChange={() => toggleSource(source.id, vendorSources, setVendorSources)} className="accent-white" /> {source.label}
                  {crawlMode === "headless" && <span className="text-[9px] px-1 py-0.5 bg-[var(--surface3)] text-[var(--muted)] rounded">渲染</span>}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.crawlInterval}</label>
            <select value={crawlInterval} onChange={e => setCrawlInterval(e.target.value)} className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)] focus:outline-none focus:border-[var(--sub)]">
              <option value="6h">{t.crawler.every6h}</option><option value="12h">{t.crawler.every12h}</option><option value="daily">{t.crawler.daily}</option><option value="3d">{t.crawler.every3d}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.pagesLabel}</label>
              <select value={vendorPages} onChange={e => setVendorPages(Number(e.target.value))} className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)] focus:outline-none">
                <option value={1}>{t.crawler.pageOne}</option><option value={2}>{t.crawler.pageTwo}</option><option value={3}>{t.crawler.pageThree}</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.delayLabel}</label>
              <select value={requestDelayMs} onChange={e => setRequestDelayMs(Number(e.target.value))} className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)] focus:outline-none">
                <option value={800}>{t.crawler.delayFast}</option><option value={1200}>{t.crawler.delayNormal}</option><option value={2000}>{t.crawler.delaySlow}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--fg)]">{t.crawler.customerSources}</h3>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.buyerPlatforms}</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {BUYER_PLATFORMS.map((source) => (
                <label key={source.id} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)] cursor-pointer">
                  <input type="checkbox" checked={customerSources.includes(source.id)} onChange={() => toggleSource(source.id, customerSources, setCustomerSources)} className="accent-white" /> {source.label}
                </label>
              ))}
            </div>
            <p className="text-[10.5px] text-[var(--sub)] mt-2">{t.crawler.buyerPlatformsHint}</p>
          </div>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.targetCountries}</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {COUNTRY_OPTIONS.map((country) => (
                <label key={country.id} className={`flex items-center gap-1.5 text-[12px] cursor-pointer px-2.5 py-1.5 rounded-full border transition ${targetCountries.includes(country.id) ? "border-[var(--fg)] text-[var(--fg)] bg-[var(--surface2)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"}`}>
                  <input
                    type="checkbox"
                    checked={targetCountries.includes(country.id)}
                    onChange={() => toggleSource(country.id, targetCountries, setTargetCountries)}
                    className="hidden"
                  />
                  {lang === "zh" ? country.zh : country.en}
                </label>
              ))}
            </div>
            <p className="text-[10.5px] text-[var(--sub)] mt-2">{t.crawler.countriesHint}</p>
          </div>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)]">{t.crawler.autoMarketing}</h3>
            <button
              onClick={() => setAutoMarketing(!autoMarketing)}
              className={`relative w-11 h-6 rounded-full transition ${autoMarketing ? "bg-[var(--ok)]" : "bg-[var(--surface3)]"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${autoMarketing ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <p className="text-[11px] text-[var(--sub)]">{t.crawler.autoMarketingDesc}</p>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.autoCampaign}</label>
            <select
              value={autoCampaignId}
              onChange={e => setAutoCampaignId(e.target.value)}
              className="w-full h-9 px-3 mt-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)] focus:outline-none"
            >
              <option value="">{t.crawler.autoCampaignAuto}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}（{c.status}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.senderEmail}</label>
            <input
              type="email"
              value={senderEmail}
              onChange={e => setSenderEmail(e.target.value)}
              placeholder="sales@yourcompany.com"
              className="w-full h-9 px-3 mt-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.senderSmtpHost}</label>
              <input
                type="text"
                value={senderSmtpHost}
                onChange={e => setSenderSmtpHost(e.target.value)}
                placeholder={t.crawler.senderSmtpHostAuto}
                className="w-full h-9 px-3 mt-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.senderSmtpPort}</label>
              <input
                type="number"
                value={senderSmtpPort}
                onChange={e => setSenderSmtpPort(Number(e.target.value) || 465)}
                className="w-full h-9 px-3 mt-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.crawler.senderSmtpPass}</label>
            <input
              type="password"
              value={senderSmtpPass}
              onChange={e => setSenderSmtpPass(e.target.value)}
              placeholder={t.crawler.senderSmtpPassPlaceholder}
              className="w-full h-9 px-3 mt-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] focus:outline-none"
            />
            <p className="text-[10.5px] text-[var(--sub)] mt-1.5">{t.crawler.senderEmailHint}</p>
          </div>
</div>

      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]">
          {saved ? <><Check className="w-4 h-4" /> {t.crawler.saved}</> : <><Settings className="w-4 h-4" /> {t.crawler.saveConfig}</>}
        </button>
        {saveError && <span className="self-center text-[12px] text-red-400">{saveError}</span>}
        <Link href="/crawl-center" className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--surface2)] border border-[var(--border)] text-[var(--fg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]">
          <Radio className="w-4 h-4" /> {t.crawler.crawlNow}
        </Link>
      </div>
    </div>
  );
}
