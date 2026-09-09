"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Card";
import { Radio, Plus, Loader2, Eye, Download, X, Check, Globe, ArrowLeft, Building2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/i18n/LangContext";

export default function VendorCrawl() {
  const { t, lang } = useLang();
  const [showPanel, setShowPanel] = useState(false);
  const [target, setTarget] = useState<"supplier" | "buyer">("supplier");
  const [keyword, setKeyword] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [crawlMessage, setCrawlMessage] = useState("");
  const [needVerify, setNeedVerify] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (showPanel) {
      fetch("/api/crawler-config")
        .then(r => r.json())
        .then(d => {
          setConfig(d);
          const kws = (target === "buyer" ? d.customerKeywords : d.vendorKeywords) || "传感器";
          setKeyword(kws.split(",")[0].trim());
        });
    }
  }, [showPanel, target]);

  const switchTarget = (next: "supplier" | "buyer") => {
    if (next === target) return;
    setTarget(next);
    setVendors([]);
    setSources([]);
    setCrawlMessage("");
    setDetailId(null);
    const kws = (next === "buyer" ? config?.customerKeywords : config?.vendorKeywords) || "传感器";
    setKeyword((kws || "").split(",")[0].trim());
  };

  const handleCrawl = async () => {
    setCrawling(true);
    setVendors([]);
    setSources([]);
    setCrawlMessage("");
    setNeedVerify(false);
    try {
      const fallbackKeyword = (target === "buyer"
        ? config?.customerKeywords
        : config?.vendorKeywords)?.split(",")[0]?.trim() || "传感器";

      if (target === "buyer") {
        const res = await fetch("/api/customers/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: keyword || fallbackKeyword,
            countries: config?.targetCountries || "Germany,USA,Mexico,Brazil,UAE",
            preview: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || t.vendors.createFail);
          return;
        }
        const leads = Array.isArray(data.leads) ? data.leads.map((l: any) => ({
          name: l.company || l.name,
          email: l.email,
          phone: l.phone,
          country: l.country,
          category: l.industry,
          website: l.sourceUrl,
          source: l.source,
          sourceUrl: l.sourceUrl,
          notes: l.notes,
          isBuyer: true,
        })) : [];
        setVendors(leads);
        setSources([{ label: data.source || "采购商采集", count: leads.length, error: data.error }]);
        setCrawlMessage(leads.length === 0 ? "采集完成，但没有找到可核验的采购商。请更换关键词后重试。" : "");
        return;
      }

      const res = await fetch("/api/vendors/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword || fallbackKeyword, preview: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || t.vendors.createFail);
        return;
      }
      if (data.needVerify) {
        setNeedVerify(true);
        setCrawlMessage(t.vendors.verifyHint);
        return;
      }
      const nextVendors = Array.isArray(data.vendors) ? data.vendors : [];
      const nextSources = Array.isArray(data.sources) ? data.sources : [];
      setVendors(nextVendors);
      setSources(nextSources);
      const sourceError = nextSources.find((source: any) => source.error)?.error;
      setCrawlMessage(sourceError || (nextVendors.length === 0 ? "采集完成，但没有找到可核验的企业页面。请更换关键词后重试。" : ""));
    } catch {
      setCrawlMessage(t.networkError);
    } finally {
      setCrawling(false);
    }
  };

  const handleResume = async () => {
    setCrawling(true);
    try {
      const res = await fetch("/api/vendors/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: true, preview: true }),
      });
      const data = await res.json();
      if (data.needVerify) {
        setCrawlMessage(t.vendors.verifyNotDone);
        return;
      }
      if (!res.ok) {
        alert(data.error || t.vendors.createFail);
        return;
      }
      const nextVendors = Array.isArray(data.vendors) ? data.vendors : [];
      const nextSources = Array.isArray(data.sources) ? data.sources : [];
      setVendors(nextVendors);
      setSources(nextSources);
      setNeedVerify(false);
      setCrawlMessage(nextSources[0]?.error || (nextVendors.length === 0 ? "验证已通过，但页面没有可核验的企业结果。" : ""));
    } catch {
      setCrawlMessage(t.networkError);
    } finally {
      setCrawling(false);
    }
  };

  const handleImport = async (v: any) => {
    setImporting((prev) => new Set(prev).add(v.name));
    try {
      if (v.isBuyer) {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: v.name,
            company: v.name,
            email: v.email || null,
            phone: v.phone || null,
            country: v.country || null,
            industry: v.category || null,
            source: v.source || "公开网页检索",
            notes: v.notes || `来源: ${v.sourceUrl || ""}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || t.vendors.createFail);
          return;
        }
        setVendors((prev) => prev.filter((x) => x.name !== v.name));
        return;
      }

      const res = await fetch("/api/vendors/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ import: true, vendor: v }),
      });
      const data = await res.json();
      if (data.success) {
        setVendors((prev) => prev.filter((x) => x.name !== v.name));
      } else {
        alert(data.error || t.vendors.createFail);
      }
    } catch {
      alert(t.networkError);
    } finally {
      setImporting((prev) => { const n = new Set(prev); n.delete(v.name); return n; });
    }
  };

  const handleImportAll = async () => {
    for (const v of [...vendors]) await handleImport(v);
  };

  const detailVendor = vendors.find((v: any) => v.name === detailId);

  return (
    <div className="flex items-center gap-2">
      <Link href="/vendors/new">
        <Button variant="secondary"><Plus className="w-4 h-4" /> {t.vendors.manualAdd}</Button>
      </Link>
      <div className="relative">
        <Button onClick={() => { setShowPanel(!showPanel); setDetailId(null); }}>
          <Radio className="w-4 h-4" /> {t.vendors.oneClickCrawl}
        </Button>

        {showPanel && (
          <div className="absolute right-0 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl z-50" style={{ width: detailVendor ? 640 : 440 }}>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {detailId ? (
                    <button onClick={() => setDetailId(null)} className="text-[var(--sub)] hover:text-[var(--fg)]">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  ) : vendors.length > 0 ? null : (
                    <Globe className="w-4 h-4" />
                  )}
                   <h4 className="text-[13px] font-semibold text-[var(--fg)]">{detailVendor ? t.vendors.vendorDetail : vendors.length > 0 || sources.length > 0 ? t.vendors.crawlResult : t.vendors.aiDiscoverTitle}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {vendors.length > 0 && !detailId && (
                       <button onClick={() => { setVendors([]); setSources([]); setCrawlMessage(""); }} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> {t.vendors.back}
                    </button>
                  )}
                  <button onClick={() => { setShowPanel(false); setDetailId(null); }} className="text-[var(--sub)] hover:text-[var(--fg)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {detailVendor ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    <div className="bg-[var(--surface2)] rounded-xl p-3">
                      <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider mb-2">{t.vendors.basicInfo}</p>
                      <p className="text-[var(--fg)] font-semibold">{detailVendor.name}</p>
                      {detailVendor.contactName && <p className="text-[var(--muted)] mt-1">{t.vendors.contact}: {detailVendor.contactName}</p>}
                      {detailVendor.phone && <p className="text-[var(--muted)]">{t.vendors.phone}: {detailVendor.phone}</p>}
                      {detailVendor.email && <p className="text-[var(--muted)] truncate">{t.email}: {detailVendor.email}</p>}
                      <p className="text-[var(--sub)] text-[11px] mt-1">来源: {detailVendor.source}</p>
                    </div>
                    <div className="bg-[var(--surface2)] rounded-xl p-3">
                      <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider mb-2">{t.vendors.enterpriseInfo}</p>
                      {detailVendor.address && <p className="text-[var(--muted)]">{t.vendors.address}: {detailVendor.address}</p>}
                      {detailVendor.website && (
                        <p className="text-[var(--muted)] break-all">
                          {t.vendors.website}:{" "}
                          <a
                            href={detailVendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0071e3] hover:underline break-all"
                          >
                            {detailVendor.website}
                          </a>
                        </p>
                      )}
                      {detailVendor.officialWebsite && detailVendor.officialWebsite !== detailVendor.website && (
                        <p className="text-[var(--muted)] break-all">
                          {t.vendors.officialWebsite}:{" "}
                          <a
                            href={detailVendor.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0071e3] hover:underline break-all"
                          >
                            {detailVendor.officialWebsite}
                          </a>
                        </p>
                      )}
                      {detailVendor.category && <p className="text-[var(--muted)]">{t.vendors.industry}: {detailVendor.category}</p>}
                      {detailVendor.isBuyer && detailVendor.country && <p className="text-[var(--muted)]">{t.vendors.region}: {detailVendor.country}</p>}
                      {!detailVendor.isBuyer && <p className="text-[var(--muted)]">{t.vendors.rating}: {"★".repeat(detailVendor.rating || 0)}{"☆".repeat(5 - (detailVendor.rating || 0))}</p>}
                    </div>
                  </div>
                  {!detailVendor.isBuyer && detailVendor.certificates?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {detailVendor.certificates.map((c: string) => (
                        <span key={c} className="px-2 py-0.5 bg-[var(--infobg)] text-[#0071e3] rounded-md text-[11px] font-medium">{c}</span>
                      ))}
                    </div>
                  )}
                  {detailVendor.notes && <p className="text-[12px] text-[var(--sub)]">{detailVendor.notes}</p>}
                  {detailVendor.products?.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider mb-2">{t.vendors.productList} ({detailVendor.products.length})</p>
                      <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {detailVendor.products.map((p: any, i: number) => (
                          <div key={i} className="text-[12px] flex justify-between text-[var(--muted)]">
                            <span className="truncate mr-2">{p.name}</span>
                            {p.price && <span className="text-[var(--fg)] flex-shrink-0">{p.price}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={() => handleImport(detailVendor)} disabled={importing.has(detailVendor.name)} size="sm" className="w-full">
                    {importing.has(detailVendor.name) ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.vendors.importing}</> : <><Download className="w-3.5 h-3.5" /> {detailVendor.isBuyer ? t.vendors.confirmImportBuyer : t.vendors.confirmImport}</>}
                  </Button>
                </div>
              ) : vendors.length > 0 || sources.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[11px] text-[var(--muted)]">
                        {t.vendors.resultSummary.replace("{count}", String(sources.length)).replace("{total}", String(vendors.length))}
                      </p>
                      {crawlMessage && <p className="text-[11px] text-[#f5a623] mt-1">{crawlMessage}</p>}
                      <div className="flex gap-2 mt-1">
                        {sources.map((s: any) => (
                          <span key={s.label} className="text-[10px] px-2 py-0.5 bg-[var(--surface2)] rounded-full text-[var(--muted)]">
                            {s.label}: {s.count}{s.error ? " ⚠" : " ✓"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleImportAll} className="text-[12px] text-[var(--fg)] hover:underline flex-shrink-0">{t.vendors.importAll}</button>
                  </div>
                  {vendors.length === 0 ? (
                    <div className="rounded-xl bg-[var(--surface2)] px-4 py-6 text-center text-[12px] text-[var(--muted)]">
                      没有可展示的真实企业结果。系统不会用 AI 编造客户资料。
                    </div>
                  ) : vendors.map((v: any) => (
                    <div key={v.name + v.source} className="flex items-center justify-between bg-[var(--surface2)] rounded-xl px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[var(--fg)] font-medium truncate">{v.name}</p>
                        <p className="text-[11px] text-[var(--sub)] truncate">
                          {v.phone && <span className="mr-2">📞 {v.phone}</span>}
                          {v.email && <span className="mr-2">✉ {v.email}</span>}
                          {v.isBuyer && v.country && <span className="mr-2">🌍 {v.country}</span>}
                          {v.products?.length > 0 && <span>📦 {v.products.length}产品</span>}
                        </p>
                        <p className="text-[10px] text-[#0071e3] mt-0.5">@{v.source}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setDetailId(v.name)} className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[#333] transition">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleImport(v)} disabled={importing.has(v.name)}
                          className="p-1.5 rounded-lg text-[var(--ok)] hover:bg-[var(--okbg)] transition disabled:opacity-30">
                          {importing.has(v.name) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-[var(--sub)] mb-3">{t.vendors.aiDiscoverDesc}</p>
                  <div className="mb-3 bg-[var(--surface2)] rounded-xl p-3 space-y-2">
                    <p className="text-[11px] text-[var(--sub)]">{t.vendors.targetLabel}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => switchTarget("supplier")}
                        className={`h-9 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition ${target === "supplier" ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--surface3)] text-[var(--muted)] hover:text-[var(--fg)]"}`}>
                        <Building2 className="w-4 h-4" /> {t.vendors.targetSupplier}
                      </button>
                      <button onClick={() => switchTarget("buyer")}
                        className={`h-9 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition ${target === "buyer" ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--surface3)] text-[var(--muted)] hover:text-[var(--fg)]"}`}>
                        <ShoppingBag className="w-4 h-4" /> {t.vendors.targetBuyer}
                      </button>
                    </div>
                  </div>
                  {config && (
                    <div className="mb-3 bg-[var(--surface2)] rounded-xl p-3 space-y-1.5 text-[11px]">
                      <p className="text-[var(--sub)]">
                        {t.vendors.keyword}: <span className="text-[var(--fg)]">{target === "buyer" ? config.customerKeywords || "industrial sensors" : config.vendorKeywords || "传感器,控制器"}</span>
                      </p>
                      {target === "supplier" && (
                        <p className="text-[var(--sub)]">
                          {t.vendors.platform}: <span className="text-[var(--fg)]">{JSON.parse(config.vendorSources || '["1688","hc360"]').join("、")}</span>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.vendors.searchKeyword}</label>
                      <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                        className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] focus:outline-none"
                        placeholder={target === "buyer" ? config?.customerKeywords?.split(",")[0] || "industrial sensors" : config?.vendorKeywords?.split(",")[0] || "传感器"} />
                      <p className="text-[10px] text-[var(--sub)] mt-1">
                        {t.vendors.crawlKeywords}: {target === "buyer" ? config?.customerKeywords || "" : config?.vendorKeywords || ""}
                        <button onClick={() => setKeyword((target === "buyer" ? config?.customerKeywords : config?.vendorKeywords)?.split(",")[0]?.trim() || "")} className="ml-2 text-[var(--fg)] hover:underline">{t.vendors.useFirst}</button>
                      </p>
                    </div>
                  </div>
                  {needVerify ? (
                    <button onClick={handleResume} disabled={crawling}
                      className="w-full h-9 bg-[#0071e3] text-white text-[13px] font-semibold rounded-full hover:bg-[#0a5bb5] disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {crawling ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.vendors.continueLoading}</> : <><Check className="w-4 h-4" /> {t.vendors.continueCrawl}</>}
                    </button>
                  ) : (
                    <button onClick={handleCrawl} disabled={crawling}
                      className="w-full h-9 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {crawling ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.vendors.crawlingStatus}</> : <><Globe className="w-4 h-4" /> {t.vendors.startCrawl}</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
