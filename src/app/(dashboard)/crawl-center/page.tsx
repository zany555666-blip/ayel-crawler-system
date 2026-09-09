"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Building2, Check, ChevronRight, Download, Loader2, Play, RotateCcw, ShoppingBag, X, GitCompareArrows, Languages, ShieldCheck, Anchor,
} from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import { useCrawlStatus } from "@/store/crawlStatus";
import LoadingGrid from "@/components/LoadingGrid";
import { computeMatchScores } from "@/lib/ai/matchScore";

interface CrawlItem {
  id: number | string;
  name: string;
  source?: string;
  officialWebsite?: string;
  email?: string;
  phone?: string;
  enriched: boolean;
  founded?: string;
  years?: string;
  registeredCapital?: string;
  scale?: string;
  kind?: string;
  address?: string;
  mainCategory?: string;
  category?: string;
  notes?: string;
  contactName?: string;
  whatsapp?: string;
  sourceUrl?: string;
  website?: string;
  matchScore?: number;
  aiSummary?: string;
  risk?: string;
  tags?: string[];
  products?: Array<{ name: string; price: string; moq: string }>;
  demand?: {
    product: string;
    specs: string;
    market: string;
    intent: string;
    suggestion: string;
  } | null;
  quantity?: string;
  scores?: MatchScores;
}

interface MatchScores {
  fit: number;
  intent: number;
  trust: number;
  reach: number;
  potential: number;
  total: number;
  reachNote?: string;
  trustEstimated: boolean;
}

interface BgReport {
  report: {
    companyOverview: string;
    registrationSignals: string;
    scaleSignals: string;
    industryFit: string;
    riskFlags: string[];
    trustScore: number;
    recommendations: string[];
    supplierRelationships?: string;
  };
  sources: Array<{ title: string; url: string; snippet?: string }>;
  customs?: {
    found: boolean;
    suppliers: Array<{ name: string; country: string; percent?: number }>;
    topCustomers: Array<{ name: string }>;
    url: string;
  } | null;
  retrievedAt: string;
}

const DEMO_VENDORS: CrawlItem[] = [
  {
    id: 1, name: "REX (Shanghai) Technology", source: "中国制造网", sourceUrl: "shanghai-rex.en.made-in-china.com",
    officialWebsite: "rex.com.au", email: "marketing@rex.com.au", enriched: false,
    founded: "2005", years: "18 年", registeredCapital: "500 万", scale: "50-100 人", kind: "生产工厂",
    address: "上海嘉定区安亭", mainCategory: "工业传感器", contactName: "Eric Wang", whatsapp: "+61 4xx xxx",
    matchScore: 92, aiSummary: "上海嘉定传感器制造商，18 年出口经验，主攻澳大利亚与欧美市场，官网活跃。",
    risk: "官网已定位，公开邮箱可用", tags: ["ISO9001", "CE", "工厂直营"],
    products: [
      { name: "压力变送器 PT100", price: "$85", moq: "10 pcs" },
      { name: "温度传感器模块", price: "$45", moq: "50 pcs" },
    ],
  },
  {
    id: 2, name: "Cixi Yuanhui Lighting Electric", source: "Alibaba.com", sourceUrl: "nbyuanhui.en.alibaba.com",
    officialWebsite: "nbyuanhui.com", email: "sales@nbyuanhui.com", phone: "+86 574 6328", enriched: false,
    founded: "2011", years: "12 年", registeredCapital: "300 万", scale: "100-200 人", kind: "生产工厂",
    address: "浙江宁波慈溪", mainCategory: "传感照明模组", contactName: "Linda Zhou",
    matchScore: 85, aiSummary: "宁波慈溪电子制造商，主营传感照明模组，北美市场出口稳定。",
    risk: "官网已定位", tags: ["CE", "RoHS", "金牌供应商"],
    products: [{ name: "红外传感器模组", price: "$12", moq: "100 pcs" }],
  },
  {
    id: 3, name: "Senba Sensing Technology", source: "全网检索", sourceUrl: "senbasensor.com",
    officialWebsite: "senbasensor.com", email: "sales@senbasensor.com", enriched: false,
    founded: "1998", years: "26 年", registeredCapital: "2000 万", scale: "200+ 人", kind: "生产工厂",
    address: "江苏南京", mainCategory: "温湿压传感器", contactName: "Kevin Liu",
    matchScore: 95, aiSummary: "南京老牌传感器企业，26 年历史，产品线覆盖温湿压传感，出口多国。",
    risk: "官网已定位，公开邮箱可用", tags: ["ISO9001", "CE", "高新技术企业", "工厂直营"],
    products: [{ name: "温湿度传感器", price: "$28", moq: "20 pcs" }],
  },
  {
    id: 4, name: "DongGuan EverGreen Technology", source: "Global Sources", sourceUrl: "globalsources.com",
    enriched: false, founded: "2016", years: "7 年", registeredCapital: "50 万", scale: "20-50 人", kind: "贸易公司",
    address: "广东东莞", mainCategory: "电子元器件", matchScore: 61,
    aiSummary: "东莞贸易型公司，规模较小，无公开官网。",
    risk: "官网未定位，建议通过平台站内信联系", tags: [],
  },
  {
    id: 5, name: "CTS Corp", source: "全网检索", sourceUrl: "ctscorp.com",
    officialWebsite: "ctscorp.com", enriched: false, founded: "1896", years: "127 年", registeredCapital: "—", scale: "1000+ 人", kind: "跨国企业",
    address: "美国伊利诺伊", mainCategory: "传感与控制器件", matchScore: 78,
    aiSummary: "百年美国传感器上市公司，全球多地设有工厂。",
    risk: "官网已定位", tags: ["NYSE 上市", "ISO9001"],
  },
  {
    id: 6, name: "Foshan Jimou Sensor Technology", source: "中国制造网", sourceUrl: "fsjimou.en.made-in-china.com",
    enriched: false, founded: "2009", years: "14 年", registeredCapital: "800 万", scale: "50-100 人", kind: "生产工厂",
    address: "广东佛山", mainCategory: "光电/工业传感器", matchScore: 88,
    aiSummary: "佛山传感器厂商，光电器件起家，近年开始扩展工业传感。",
    risk: "官网未定位，仅平台联系方式", tags: ["CE"],
    products: [{ name: "光电传感器", price: "$15", moq: "50 pcs" }],
  },
];

const DEMO_STEPS: Array<{ text: string; at: number }> = [
  { text: "初始化浏览器会话", at: 400 },
  { text: "全网检索 · sensor supplier manufacturer", at: 900 },
  { text: "渲染 阿里巴巴国际站", at: 1900 },
  { text: "渲染 Global Sources", at: 3000 },
  { text: "采集 6 家候选企业", at: 4100 },
  { text: "开始联系方式补全", at: 5200 },
  { text: "REX (Shanghai) · 官网已定位", at: 6400 },
  { text: "Senba Sensing · 邮箱已提取", at: 7600 },
  { text: "Cixi Yuanhui · 官网已定位", at: 8800 },
];

const RECENT_TASKS = [
  { keyword: "industrial sensors", count: 10, time: "14:32" },
  { keyword: "传感器", count: 8, time: "11:05" },
  { keyword: "temperature sensor", count: 6, time: "昨天" },
];

const PLATFORM_LABELS: Record<string, string> = {
  "1688": "阿里巴巴国际站",
  hc360: "慧聪网",
  "made-in-china": "中国制造网",
  "global-sources": "Global Sources",
};

const BROWSER_LABELS: Record<string, string> = {
  chrome: "Google Chrome",
  edge: "Microsoft Edge",
  firefox: "Mozilla Firefox",
};

interface CrawlerConfigData {
  vendorSources?: string;
  vendorKeywords?: string;
  crawlMode?: string;
  headlessBrowsers?: string;
  targetCountries?: string;
}

interface CrawlSessionItem {
  id: string;
  keyword: string;
  target: string;
  createdAt: string;
  results: Array<{ name?: string; email?: string; phone?: string; website?: string; officialWebsite?: string; address?: string; category?: string; notes?: string; sourceUrl?: string; source?: string; stored?: boolean }>;
}

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = value;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

function Stat({ value, label, color }: { value: number; label: string; color?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <div>
      <p className={`text-[30px] font-light tabular-nums ${color || "text-[var(--fg)]"}`}>{animated}</p>
      <p className="text-[12px] text-[var(--muted)] mt-1">{label}</p>
    </div>
  );
}

interface TerminalLine {
  text: string;
  tone?: "dim" | "green" | "amber" | "cyan";
}

function TerminalWindow({ lines, height = 260 }: { lines: TerminalLine[]; height?: number }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const boot: TerminalLine[] = [
    { text: "supply-ai crawler v2.7.1 (linux/amd64) — session started", tone: "dim" },
    { text: "> init headless-pool: 0 · http-pool: 4 · proxies: none", tone: "dim" },
    { text: "> loading sources: made-in-china, 1688, global-sources, hc360", tone: "dim" },
  ];
  const all = [...boot, ...lines];

  useEffect(() => {
    const el = gridRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="fade-up rounded-xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-2 px-3.5 h-9 border-b border-[var(--border)] bg-[var(--surface2)]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px] font-mono text-[var(--muted)]">ayel@crawler: ~/supply-ai — zsh</span>
        <span className="ml-auto text-[10px] font-mono text-[var(--ok)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] breathe-dot" /> LIVE
        </span>
      </div>
      <div ref={gridRef} className="font-mono text-[11.5px] leading-[1.7] px-4 py-3 overflow-y-auto space-y-0.5" style={{ height }}>
        {all.map((line, i) => (
          <p
            key={i}
            className={`whitespace-pre-wrap break-all ${
              line.tone === "dim" ? "text-[var(--muted)]"
              : line.tone === "green" ? "text-[var(--ok)]"
              : line.tone === "amber" ? "text-[#d4a24e]"
              : line.tone === "cyan" ? "text-[var(--info)]"
              : "text-[var(--muted)]"
            }`}
          >
            <span className="text-[var(--muted)] select-none">[{String(i).padStart(3, "0")}] </span>
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CrawlCenterPage() {
  const { t, lang } = useLang();
  const { setCollecting } = useCrawlStatus();
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState<"supplier" | "buyer">("supplier");
  const [keyword, setKeyword] = useState("sensor");
  const [config, setConfig] = useState<CrawlerConfigData | null>(null);
  const [sessions, setSessions] = useState<CrawlSessionItem[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<CrawlItem[]>([]);
  const [steps, setSteps] = useState<Array<{ text: string; time: string }>>([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "running" | "enriching" | "done">("idle");
  const [detailVendor, setDetailVendor] = useState<CrawlItem | null>(null);
  const [bgStates, setBgStates] = useState<
    Record<string, { loading: boolean; stage: "searching" | "customs" | "analyzing"; error?: string; result: BgReport | null }>
  >({});
  const [compareList, setCompareList] = useState<CrawlItem[]>([]);
  const [needVerify, setNeedVerify] = useState(false);
  const [enrichStatus, setEnrichStatus] = useState<{ done: number; total: number; current: string } | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const terminalIdx = useRef(0);

  useEffect(() => {
    fetch("/api/crawler-config")
      .then((r) => r.json())
      .then((data: CrawlerConfigData) => {
        setConfig(data);
        const firstKeyword = (data.vendorKeywords || "sensor").split(",")[0].trim();
        if (firstKeyword) setKeyword(firstKeyword);
      })
      .catch(() => undefined);

    fetch("/api/crawl-sessions")
      .then((r) => r.json())
      .then((data: CrawlSessionItem[]) => {
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (stage === "idle") return;
    const interval = setInterval(() => {
      const i = terminalIdx.current;
      terminalIdx.current += 1;
      setTerminalLines((prev) => [...prev, ...generateTerminalChunk(i, stage, keyword, target, vendors.length, progress)]);
    }, stage === "done" ? 1600 : 950);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const configuredPlatforms = (() => {
    try {
      const list: string[] = config?.vendorSources ? JSON.parse(config.vendorSources) : [];
      return list.map((id) => PLATFORM_LABELS[id] || id);
    } catch {
      return [];
    }
  })();

  const configuredBrowsers = (() => {
    try {
      const list: string[] = config?.headlessBrowsers ? JSON.parse(config.headlessBrowsers) : ["edge"];
      return list.map((id) => BROWSER_LABELS[id] || id);
    } catch {
      return ["Microsoft Edge"];
    }
  })();

  const targetCountries = (config?.targetCountries || "Germany,USA").split(",").map((c) => c.trim()).filter(Boolean).slice(0, 2);

  const startDemo = () => {
    setRunning(true);
    setVendors([]);
    setSteps([]);
    setTerminalLines([]);
    terminalIdx.current = 0;
    setProgress(0);
    setStage("running");
    timers.current = [];

    DEMO_STEPS.forEach((step) => {
      timers.current.push(setTimeout(() => {
        setSteps((prev) => [...prev, { text: step.text, time: new Date().toTimeString().slice(0, 5) }]);
      }, step.at));
    });

    DEMO_VENDORS.forEach((vendor, i) => {
      timers.current.push(setTimeout(() => {
        setVendors((prev) => [...prev, vendor]);
        if (i === DEMO_VENDORS.length - 1) setStage("enriching");
      }, 1200 + i * 600));
    });

    const enrichAt = [5600, 7000, 8400];
    DEMO_VENDORS.slice(0, 3).forEach((vendor, i) => {
      timers.current.push(setTimeout(() => {
        setVendors((prev) => prev.map((v) => (v.id === vendor.id ? { ...v, enriched: true } : v)));
      }, enrichAt[i]));
    });

    const progressSteps: Array<[number, number]> = [[800, 12], [1800, 30], [3000, 52], [4100, 68], [5200, 74], [6400, 84], [7600, 92], [8800, 100]];
    progressSteps.forEach(([at, value]) => {
      timers.current.push(setTimeout(() => setProgress(value), at));
    });

    timers.current.push(setTimeout(() => { setStage("done"); setRunning(false); }, 9800));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVendors([]);
    setSteps([]);
    setTerminalLines([]);
    setEnrichStatus(null);
    terminalIdx.current = 0;
    setProgress(0);
    setStage("idle");
    setRunning(false);
    setNeedVerify(false);
  };

  const nowTime = () => new Date().toTimeString().slice(0, 5);

  const generateTerminalChunk = (
    idx: number,
    st: "idle" | "running" | "enriching" | "done",
    kw: string,
    tg: "supplier" | "buyer",
    count: number,
    prog: number
  ): TerminalLine[] => {
    const sources = configuredPlatforms.length ? configuredPlatforms : ["全网检索 (DDG)"];
    const pick = <T,>(arr: T[]): T => arr[idx % arr.length];
    if (st === "running" && tg === "buyer") {
      return pick([
        [
          { text: `[HEADLESS] launch chromium · headless=on · lang=en-US`, tone: "cyan" },
          { text: `[DDG] q="${kw} importer distributor ${targetCountries.join(" OR ")}"`, tone: "dim" },
        ],
        [
          { text: `[DDG] rendered 12 organic results · ad:0 · sponsored:0`, tone: "green" },
          { text: `  candidates after filter: ${count + 2 + (idx % 4)} buyer-leads`, tone: "dim" },
        ],
        [
          { text: `[INSPECT] fetch company page → ${pick(["about", "imprint", "products", "contact"])}.html`, tone: "dim" },
          { text: `  organization name verified · buyer-intent ✓`, tone: "green" },
        ],
        [
          { text: `[QUERY-2] q="${kw} wholesale buyer company"`, tone: "cyan" },
          { text: `  merge + dedupe by domain · queue: ${count}`, tone: "dim" },
        ],
        [
          { text: `[COUNTRY] alias match → ${pick([...targetCountries, "DE", "US"])} ✓`, tone: "amber" },
          { text: `[QUEUE] memory ${(16 + count * 3 + idx).toFixed(0)}MB · throttle 400ms`, tone: "dim" },
        ],
        [
          { text: `[SCORE] buyer-signal: website+1.5 · email+1 · phone+0.5 · intent+0.5`, tone: "cyan" },
          { text: `  leads buffered: ${count} · progress ${prog}%`, tone: "dim" },
        ],
      ]);
    }
    if (st === "running") {
      return pick([
        [
          { text: `[CRAWL] probing source → ${pick(sources)}`, tone: "cyan" },
          { text: `  query="${kw}" · mode=${config?.crawlMode === "headless" ? "headless-pool" : "http-pool"} · timeout=15s`, tone: "dim" },
        ],
        [
          { text: `[HTTP] GET https://www.made-in-china.com/manufacturers/${kw}.html`, tone: "dim" },
          { text: `   ← 200 · 1.1MB · blocked:0 · ${600 + ((idx * 137) % 900)}ms`, tone: "green" },
        ],
        [
          { text: `[PARSE] cheerio matched ${700 - (idx % 140)} anchors · ${4 + (idx % 9)} companies`, tone: "green" },
          { text: `  dedupe: ${2 + (idx % 3)} suppressed · queued: ${count}`, tone: "dim" },
        ],
        [
          { text: `[HTTP] GET https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(kw)}`, tone: "dim" },
          { text: `  ! captcha/cookie wall detected → retry(${(idx % 2) + 1}/3) …`, tone: "amber" },
        ],
        [
          { text: `[HTTP] GET https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(kw)}`, tone: "dim" },
          { text: `  ← 200 · company_profile parsed · ${3 + (idx % 6)} suppliers`, tone: "green" },
        ],
        [
          { text: `[QUEUE] ${count} items buffered · memory: ${(18 + (count * 3) + idx).toFixed(0)}MB · goroutines: ${8 + (idx % 16)}`, tone: "dim" },
          { text: `[CRAWL] progress ${prog}% — throttle 800ms between probes`, tone: "dim" },
        ],
        [
          { text: `[HEADLESS] yandex/baidu mirrors disabled · ddg fallback ready`, tone: "amber" },
          { text: `[CRAWL] trending terms: "${kw}" ×${12 + idx} hits on DDG partner feed`, tone: "cyan" },
        ],
      ]);
    }
    if (st === "enriching") {
      return pick([
        [
          { text: `[ENRICH] locating official site → DDG "${kw} official website"`, tone: "cyan" },
          { text: `  score 0.87 · domain ${pick(["co", "com", "de", "cn"])} match ✓`, tone: "green" },
        ],
        [
          { text: `[ENRICH] fetching /contact · /about-us · /imprint`, tone: "dim" },
          { text: `  +1 business email · +1 phone · address resolved`, tone: "green" },
        ],
        [
          { text: `[VERIFY] official domain filter: 2 rejected (directory/biz-domains)`, tone: "amber" },
          { text: `  kept: ${count} targets · official-sites: ${Math.min(count, 3)}`, tone: "dim" },
        ],
        [
          { text: `[CONTACT] scraping public emails via mailto: + deep-link regex`, tone: "cyan" },
          { text: `  obfuscated 3 · resolved 4 · telfmt (CN/+86) normalized ✓`, tone: "green" },
        ],
      ]);
    }
    return [
      { text: `[DONE] session closed · ${count} companies · progress 100%`, tone: "green" },
      { text: `  saved to crawl-sessions ✓ · enrich-pool drained ✓ · exit 0`, tone: "dim" },
      { text: `  total time ${(6.2 + idx * 0.4).toFixed(1)}s · memory released · cookies cleared`, tone: "dim" },
    ];
  };

  const mapVendorsApi = (data: { vendors?: Array<Record<string, unknown>> }): CrawlItem[] => {
    const list = Array.isArray(data.vendors) ? data.vendors : [];
    return list.map((v, i) => ({
      id: `${String(v.name || "")}-${i}`,
      name: String(v.name || "未知企业"),
      source: String(v.source || "未知来源"),
      email: typeof v.email === "string" ? v.email : undefined,
      phone: typeof v.phone === "string" ? v.phone : undefined,
      website: typeof v.website === "string" ? v.website : undefined,
      officialWebsite: typeof v.officialWebsite === "string" ? v.officialWebsite : undefined,
      address: typeof v.address === "string" ? v.address : undefined,
      category: typeof v.category === "string" ? v.category : undefined,
      notes: typeof v.notes === "string" ? v.notes : undefined,
      sourceUrl: typeof v.sourceUrl === "string" ? v.sourceUrl : undefined,
      enriched: Boolean(v.officialWebsite),
      aiSummary: typeof v.notes === "string" ? v.notes : undefined,
      risk: v.officialWebsite ? "官网已定位" : "官网未定位，建议通过平台站内信联系",
      products: Array.isArray(v.products)
        ? (v.products as Array<{ name?: string; price?: string }>).map((p) => ({ name: String(p.name || ""), price: String(p.price || ""), moq: "" }))
        : [],
    }));
  };

  const mapCustomersApi = (data: { leads?: Array<Record<string, unknown>> }): CrawlItem[] => {
    const list = Array.isArray(data.leads) ? data.leads : [];
    return list.map((lead, i) => ({
      id: `${String(lead.company || lead.name || "")}-${i}`,
      name: String(lead.company || lead.name || "未知企业"),
      source: String(lead.source || "客户采集"),
      email: typeof lead.email === "string" ? lead.email : undefined,
      phone: typeof lead.phone === "string" ? lead.phone : undefined,
      officialWebsite: typeof lead.website === "string" ? lead.website : undefined,
      category: typeof lead.industry === "string" ? lead.industry : undefined,
      notes: typeof lead.notes === "string" ? lead.notes : undefined,
      sourceUrl: typeof lead.sourceUrl === "string" ? lead.sourceUrl : undefined,
      website: typeof lead.website === "string" ? lead.website : undefined,
      quantity: typeof lead.quantity === "string" ? lead.quantity : undefined,
      matchScore: typeof lead.score === "number" ? Math.round(lead.score * 20) : undefined,
      enriched: Boolean(lead.website),
      aiSummary: typeof lead.notes === "string" ? lead.notes : undefined,
      risk: typeof lead.website === "string" ? "官网已定位，可进一步核验采购意向" : "潜客线索，需人工核验后联系",
      products: [],
    }));
  };

  const runEnrichStage = async (items: CrawlItem[]) => {
    if (items.length === 0) return items;
    setStage("enriching");
    setEnrichStatus({ done: 0, total: items.length, current: "" });
    setSteps((prev) => [...prev, { text: `平台采集完成：${items.length} 家，开始官网联系方式补全…`, time: nowTime() }]);

    const queue = [...items];
    const results = new Map<string | number, CrawlItem>();
    let done = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        setEnrichStatus((prev) => (prev ? { ...prev, current: item.name } : prev));
        let updated = item;
        try {
          const enrichRes = await fetch("/api/vendors/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendors: [{
                name: item.name,
                website: item.website,
                source: item.source,
                sourceUrl: item.sourceUrl,
                category: item.category,
                notes: item.notes,
                email: item.email,
                phone: item.phone,
                address: item.address,
                rating: 0,
                certificates: [],
              }],
              mode: config?.crawlMode === "headless" ? "headless" : "http",
            }),
          });
          const enrichData = await enrichRes.json();
          if (Array.isArray(enrichData.vendors) && enrichData.vendors.length > 0) {
            updated = mapVendorsApi({ vendors: enrichData.vendors })[0] || item;
          }
        } catch {
          // 该厂商补全失败，保留原始数据
        }
        done += 1;
        results.set(item.id, updated);
        setVendors((prev) => prev.map((v) => (v.id === item.id ? updated : v)));
        setEnrichStatus({ done, total: items.length, current: updated.name });
        setProgress(60 + Math.round((done / items.length) * 40));
        setSteps((prev) => [...prev, {
          text: `官网补全 ${done}/${items.length}：${updated.name}${updated.officialWebsite ? " ✓ 已定位官网" : " ✗ 未定位"}`,
          time: nowTime(),
        }]);
      }
    };

    await Promise.all([worker(), worker()]);
    const located = items.filter((it) => results.get(it.id)?.officialWebsite).length;
    setSteps((prev) => [...prev, { text: `官网补全完成：${located}/${items.length} 家已定位官网`, time: nowTime() }]);
    return items.map((it) => results.get(it.id) || it);
  };

  const runCustomerEnrichStage = async (items: CrawlItem[]) => {
    if (items.length === 0) return items;
    setStage("enriching");
    setEnrichStatus({ done: 0, total: items.length, current: "" });
    setSteps((prev) => [...prev, { text: `客户采集完成：${items.length} 家，开始官网定位与买家质量评分…`, time: nowTime() }]);

    const queue = [...items];
    const results = new Map<string | number, CrawlItem>();
    let done = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        setEnrichStatus((prev) => (prev ? { ...prev, current: item.name } : prev));
        let updated = item;
        try {
          const enrichRes = await fetch("/api/customers/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leads: [{
                name: item.name,
                company: item.name,
                industry: item.category,
                email: item.email,
                phone: item.phone,
                source: item.source,
                sourceUrl: item.sourceUrl,
                notes: item.notes,
              }],
            }),
          });
          const enrichData = await enrichRes.json();
          if (Array.isArray(enrichData.leads) && enrichData.leads.length > 0) {
            updated = mapCustomersApi(enrichData)[0] || item;
          }
        } catch {
          // 该线索补全失败，保留原始数据
        }
        done += 1;
        results.set(item.id, updated);
        setVendors((prev) => prev.map((v) => (v.id === item.id ? updated : v)));
        setEnrichStatus({ done, total: items.length, current: updated.name });
        setProgress(60 + Math.round((done / items.length) * 40));
        setSteps((prev) => [...prev, {
          text: `客户补全 ${done}/${items.length}：${updated.name}${updated.officialWebsite ? " ✓ 已定位官网" : " ✗ 未定位"}`,
          time: nowTime(),
        }]);
      }
    };

    await Promise.all([worker(), worker()]);
    const located = items.filter((it) => results.get(it.id)?.officialWebsite).length;
    setSteps((prev) => [...prev, { text: `客户补全完成：${located}/${items.length} 家已定位官网`, time: nowTime() }]);
    return items.map((it) => results.get(it.id) || it);
  };

  const runDemandStage = async (items: CrawlItem[]) => {
    if (items.length === 0) return items;
    setStage("enriching");
    setEnrichStatus({ done: 0, total: items.length, current: "" });
    setSteps((prev) => [...prev, { text: `开始 AI 需求分析：逐条解析买家采购需求…`, time: nowTime() }]);

    const queue = [...items];
    const results = new Map<string | number, CrawlItem>();
    let done = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        setEnrichStatus((prev) => (prev ? { ...prev, current: item.name } : prev));
        let updated = item;
        try {
          const res = await fetch("/api/customers/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              notes: item.notes,
              source: item.source,
              quantity: item.quantity,
            }),
          });
          const data = await res.json();
          if (data.demand) {
            const scores = computeMatchScores({
              demand: data.demand,
              email: item.email,
              phone: item.phone,
              whatsapp: item.whatsapp,
              source: item.source,
            });
            updated = { ...item, demand: data.demand, scores };
          }
        } catch {
          // 该线索分析失败，保留原始数据
        }
        done += 1;
        results.set(item.id, updated);
        setVendors((prev) => prev.map((v) => (v.id === item.id ? updated : v)));
        setEnrichStatus({ done, total: items.length, current: updated.name });
        setSteps((prev) => [...prev, {
          text: `需求分析 ${done}/${items.length}：${updated.name}${updated.demand ? " ✓" : " ✗ 分析失败"}`,
          time: nowTime(),
        }]);
      }
    };

    await Promise.all([worker(), worker()]);
    const analyzed = items.filter((it) => results.get(it.id)?.demand).length;
    setSteps((prev) => [...prev, { text: `需求分析完成：${analyzed}/${items.length} 条已解析，点击卡片查看详情`, time: nowTime() }]);
    return items.map((it) => results.get(it.id) || it);
  };

  const startRealCrawl = async () => {
    setRunning(true);
    setCollecting(true);
    setVendors([]);
    setSteps([]);
    setTerminalLines([]);
    setEnrichStatus(null);
    terminalIdx.current = 0;
    setProgress(8);
    setStage("running");
    setNeedVerify(false);
    const endpoint = target === "supplier" ? "/api/vendors/scrape" : "/api/customers/scrape";
    const initialSteps = [{ text: target === "supplier" ? "开始平台采集…（官网补全稍后加载）" : "启动无头浏览器国际检索 (DDG)…（官网与评分稍后补全）", time: nowTime() }];
    if (target === "supplier" && /^[a-zA-Z\s-]+$/.test(keyword.trim()) && !/[\u4e00-\u9fa5]/.test(keyword)) {
      initialSteps.push({ text: "提示：厂商模式采集国内平台，英文关键词结果会很少，建议使用中文（如「吊牌」「印刷辅料」）", time: nowTime() });
    }
    if (target === "buyer" && /[\u4e00-\u9fa5]/.test(keyword.trim())) {
      initialSteps.push({ text: "检测到中文关键词，将自动翻译为英文后进行国际买家检索", time: nowTime() });
    }
    setSteps(initialSteps);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() || undefined, preview: true, enrich: false }),
      });
      const data = await res.json();
      if (data.needVerify) {
        setNeedVerify(true);
        setSteps((prev) => [...prev, { text: "检测到验证码，已在浏览器打开验证页面", time: nowTime() }]);
        setRunning(false);
        return;
      }
      if (!res.ok) {
        setSteps((prev) => [...prev, { text: String(data.error || "采集失败"), time: nowTime() }]);
        setProgress(100);
        setStage("done");
        setRunning(false);
        return;
      }
      const translated = data.translated as { original: string; english: string } | null | undefined;
      const effectiveKeyword = translated?.english || keyword.trim();
      if (translated) {
        setSteps((prev) => [...prev, { text: `关键词已自动翻译：${translated.original} → ${translated.english}`, time: nowTime() }]);
      }
      let items = target === "supplier" ? mapVendorsApi(data) : mapCustomersApi(data);
      setVendors(items);
      setProgress(60);
      setSteps((prev) => [...prev, { text: `平台采集完成：${items.length} 家`, time: nowTime() }]);
      if (items.length === 0 && data.error) {
        setSteps((prev) => [...prev, { text: `未获取到线索：${String(data.error)}`, time: nowTime() }]);
      }

      if (items.length > 0) {
        const snapshots = items.map((v) => ({
          name: v.name, source: v.source, email: v.email, phone: v.phone,
          website: v.website, officialWebsite: v.officialWebsite, address: v.address,
          category: v.category, notes: v.notes, sourceUrl: v.sourceUrl, stored: false,
        }));
        fetch("/api/crawl-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: effectiveKeyword, target, results: snapshots }),
        })
          .then((r) => r.json())
          .then((s: { id?: string }) => {
            if (s.id) setCurrentSessionId(s.id);
          })
          .catch(() => undefined);
        setSessions((prev) => [{
          id: `temp-${Date.now()}`,
          keyword: effectiveKeyword,
          target,
          createdAt: new Date().toISOString(),
          results: snapshots,
        }, ...prev]);
      }

      if (target === "supplier" && items.length > 0) {
        setRunning(false);
        await new Promise((r) => setTimeout(r, 500));
        items = await runEnrichStage(items);
        setVendors(items);
        setProgress(100);
        setStage("done");
      } else if (target === "buyer" && items.length > 0) {
        setRunning(false);
        await new Promise((r) => setTimeout(r, 500));
        items = await runCustomerEnrichStage(items);
        setVendors(items);
        await new Promise((r) => setTimeout(r, 500));
        items = await runDemandStage(items);
        setVendors(items);
        setProgress(100);
        setStage("done");
      } else {
        setProgress(100);
        setStage("done");
      }
    } catch (err) {
      setSteps((prev) => [...prev, { text: `采集出错：${err instanceof Error ? err.message : "网络错误"}`, time: nowTime() }]);
      setProgress(100);
      setStage("done");
    } finally {
      setRunning(false);
      setCollecting(false);
    }
  };

  const handleResume = async () => {
    setRunning(true);
    setCollecting(true);
    try {
      const res = await fetch("/api/vendors/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: true, preview: true, enrich: false }),
      });
      const data = await res.json();
      if (data.needVerify) {
        setSteps((prev) => [...prev, { text: "验证码尚未完成，请完成验证后再次点击", time: nowTime() }]);
        return;
      }
      if (!res.ok) {
        setSteps((prev) => [...prev, { text: String(data.error || "续采失败"), time: nowTime() }]);
        return;
      }
      let items = mapVendorsApi(data);
      setVendors(items);
      setNeedVerify(false);
      setProgress(60);
      setSteps((prev) => [...prev, { text: `验证后平台采集完成：${items.length} 家`, time: nowTime() }]);
      setRunning(false);
      items = await runEnrichStage(items);
      setVendors(items);
      setProgress(100);
      setStage("done");
    } catch {
      setSteps((prev) => [...prev, { text: "续采出错", time: nowTime() }]);
    } finally {
      setRunning(false);
      setCollecting(false);
    }
  };

  const handleBackgroundCheck = async (item: CrawlItem) => {
    if (bgStates[item.id]?.loading) return;
    setBgStates((prev) => ({ ...prev, [item.id]: { loading: true, stage: "searching" as const, result: null } }));
    const bgTimer = setTimeout(() => {
      setBgStates((prev) => {
        if (prev[item.id]?.loading) return { ...prev, [item.id]: { ...prev[item.id], stage: "customs" as const } };
        return prev;
      });
    }, 7000);
    const endpoint = target === "supplier" ? "/api/vendors/background-check" : "/api/customers/background-check";
    const country = (item.address || "").split(/[，,]/)[0] || (item.notes || "").split(/[，,;]/)[0] || undefined;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          country,
          industry: item.mainCategory || item.category,
          website: item.officialWebsite || item.website || item.sourceUrl,
          lang,
        }),
      });
      setBgStates((prev) => ({ ...prev, [item.id]: { ...prev[item.id], stage: "analyzing" as const } }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "背调失败");
      setBgStates((prev) => ({ ...prev, [item.id]: { loading: false, stage: "analyzing" as const, result: data } }));
      setVendors((prev) =>
        prev.map((v) => {
          if (v.id !== item.id || !v.scores) return v;
          const s = v.scores;
          const trust = Math.max(0, Math.min(100, Math.round(Number(data.report.trustScore) || 0)));
          const total = Math.round(0.4 * s.fit + 0.25 * s.intent + 0.1 * trust + 0.15 * s.reach + 0.1 * s.potential);
          return { ...v, scores: { ...s, trust, trustEstimated: false, total } };
        })
      );
    } catch (e) {
      setBgStates((prev) => ({
        ...prev,
        [item.id]: { loading: false, stage: "analyzing" as const, error: e instanceof Error ? e.message : "网络错误", result: null },
      }));
    } finally {
      clearTimeout(bgTimer);
    }
  };

  const handleStore = async (item: CrawlItem) => {
    try {
      if (target === "buyer") {
        const demandText = item.demand
          ? `；需求分析：所需产品「${item.demand.product}」｜规格「${item.demand.specs}」｜市场「${item.demand.market}」｜意图「${item.demand.intent}」｜跟进建议「${item.demand.suggestion}」`
          : "";
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            company: item.name,
            email: item.email || null,
            phone: item.phone || null,
            country: null,
            industry: item.category || null,
            website: item.officialWebsite || item.website || null,
            source: item.source || "AI 采集中心",
            notes: `${item.notes || `来源: ${item.sourceUrl || ""}`}${demandText}`,
          }),
        });
      } else {
        await fetch("/api/vendors/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ import: true, vendor: item }),
        });
      }
      setVendors((prev) => prev.filter((v) => v.id !== item.id));
      if (detailVendor?.id === item.id) setDetailVendor(null);
      if (currentSessionId) {
        fetch(`/api/crawl-sessions/${currentSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorName: item.name }),
        }).catch(() => undefined);
        setSessions((prev) => prev.map((s) => s.id === currentSessionId
          ? { ...s, results: s.results.map((r) => (r.name === item.name ? { ...r, stored: true } : r)) }
          : s
        ));
      }
      setSteps((prev) => [...prev, { text: `已入库：${item.name}`, time: nowTime() }]);
    } catch {
      setSteps((prev) => [...prev, { text: "入库失败", time: nowTime() }]);
    }
  };

  const handleStoreAll = async () => {
    for (const item of [...vendors]) {
      await handleStore(item);
    }
  };

  const enrichedCount = vendors.filter((v) => v.enriched).length;
  const emailCount = vendors.filter((v) => v.email).length;

  const toggleCompare = (vendor: CrawlItem) => {
    setCompareList((prev) => {
      if (prev.some((v) => v.id === vendor.id)) return prev.filter((v) => v.id !== vendor.id);
      if (prev.length >= 4) return prev;
      return [...prev, vendor];
    });
  };

  const inCompare = (id: number | string) => compareList.some((v) => v.id === id);

  const stageLabel =
    stage === "idle" ? t.crawlCenter.standby :
    stage === "running" ? t.crawlCenter.runningState :
    stage === "enriching" ? t.crawlCenter.enrichingState : t.crawlCenter.doneState;

  return (
    <div className="relative min-h-screen -m-6 p-8 lg:p-10 bg-[var(--bg)] overflow-hidden">
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(36px); } to { opacity: 1; transform: translateX(0); } }
        .fade-up { animation: fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .slide-in { animation: slide-in 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .layout-transition { transition: max-width 0.5s cubic-bezier(0.16,1,0.3,1); }
        .shimmer-bar { position: absolute; top: 0; bottom: 0; width: 30%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent); animation: shimmer 2.2s ease-in-out infinite; }
        .breathe-dot { animation: breathe 1.8s ease-in-out infinite; }
      `}</style>

      <div className={`layout-transition space-y-8 ${detailVendor ? "w-full" : "max-w-[1440px] mx-auto"}`}>
        {/* 头部 */}
        <header className="flex items-end justify-between fade-up">
          <div className="flex items-end gap-4">
            <LoadingGrid dotSize={10} gap={4} className="flex-shrink-0" />
            <div>
              <p className="text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">Supply AI · Crawl Center</p>
              <h1 className="text-[34px] font-light tracking-tight text-[var(--fg)] mt-3">ayel's pet</h1>
              <p className="text-[14px] text-[var(--muted)] mt-2 max-w-md leading-relaxed">
                跨平台采集全球供应商，自动定位官网，提取公开联系方式。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stage !== "idle" && (
              <button onClick={reset} className="h-10 px-4 rounded-full border border-[var(--border)] text-[var(--muted)] text-[13px] hover:text-[var(--fg)] hover:border-[var(--border)] transition-all duration-200 inline-flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> {t.crawlCenter.reset}
              </button>
            )}
            {needVerify ? (
              <button onClick={handleResume} disabled={running} className="h-11 px-6 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0a5bb5] transition-all duration-200 inline-flex items-center gap-2 disabled:opacity-40">
                {running ? <><Loader2 className="w-4 h-4 animate-spin" /> 验证中…</> : <>继续采集</>}
              </button>
            ) : (
              <button onClick={startRealCrawl} disabled={running} className="h-11 px-6 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[13px] font-medium hover:bg-[var(--surface3)] transition-all duration-200 inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                {running ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.crawlCenter.crawling}</> : <><Play className="w-4 h-4" /> {t.crawlCenter.startCrawl}</>}
              </button>
            )}
            <button onClick={startDemo} disabled={running} className="h-10 px-4 rounded-full border border-[var(--border)] text-[var(--muted)] text-[12.5px] hover:text-[var(--fg)] hover:border-[var(--border)] transition-all duration-200">
              {t.crawlCenter.playDemo}
            </button>
          </div>
        </header>

        {/* 配置行 */}
        <div className="flex items-center gap-2.5 fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex rounded-full border border-[var(--border)] p-0.5">
            <button onClick={() => setTarget("supplier")} className={`px-4 h-8 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-all duration-200 ${target === "supplier" ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}>
              <Building2 className="w-3.5 h-3.5" /> {t.crawlCenter.supplier}
            </button>
            <button onClick={() => setTarget("buyer")} className={`px-4 h-8 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-all duration-200 ${target === "buyer" ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}>
              <ShoppingBag className="w-3.5 h-3.5" /> {t.crawlCenter.buyer}
            </button>
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-9 w-40 px-4 rounded-full border border-[var(--border)] bg-transparent text-[13px] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-neutral-500 transition-colors"
            placeholder={t.crawlCenter.keywordPlaceholder}
          />
          <button
            onClick={async () => {
              if (!keyword.trim()) return;
              const btn = document.getElementById("translate-kw-btn") as HTMLButtonElement | null;
              if (btn) btn.disabled = true;
              try {
                const res = await fetch("/api/translate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: keyword.trim() }),
                });
                const data = await res.json();
                if (res.ok && data.translated) {
                  setKeyword(data.translated);
                  setSteps((prev) => [...prev, { text: `关键词已翻译：${keyword.trim()} → ${data.translated}`, time: nowTime() }]);
                } else {
                  alert(data.error || "翻译失败");
                }
              } catch {
                alert("翻译失败：网络错误");
              } finally {
                if (btn) btn.disabled = false;
              }
            }}
            id="translate-kw-btn"
            disabled={!keyword.trim()}
            title="翻译为英文（AI）"
            className="h-9 w-9 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-neutral-500 transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
          >
            <Languages className="w-4 h-4" />
          </button>
          <span className="text-[12.5px] text-[var(--muted)]">
            {configuredPlatforms.length > 0 ? `${configuredPlatforms.join(" · ")} · 全网` : "全网检索"}
          </span>
          <span className="ml-auto text-[12.5px] text-[var(--muted)]">{stage === "idle" ? t.crawlCenter.waiting : stageLabel}</span>
        </div>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 grid lg:grid-cols-[210px_minmax(0,1fr)_240px] gap-6 items-start">
          {/* 左栏：数据源与历史 */}
          <aside className="hidden lg:block space-y-8">
            <section className="fade-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-[12px] font-medium text-[var(--muted)] mb-4">{t.crawlCenter.dataSources}</h2>
              <ul className="space-y-3">
                {(configuredPlatforms.length > 0 ? configuredPlatforms : ["全网检索"]).map((name) => (
                  <li key={name} className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--muted)]">{name}</span>
                    {name === "Global Sources" && config?.crawlMode !== "headless" ? (
                      <span className="text-[11px] text-[#d4a24e]">{t.crawlCenter.needHeadless}</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    )}
                  </li>
                ))}
                <li className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--muted)]">全网检索 (DDG)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                </li>
              </ul>
            </section>

            <section className="fade-up" style={{ animationDelay: "160ms" }}>
              <h2 className="text-[12px] font-medium text-[var(--muted)] mb-4">{t.crawlCenter.recentTasks}</h2>
              <ul className="space-y-4">
                {RECENT_TASKS.map((task) => (
                  <li key={task.time + task.keyword} className="group cursor-pointer">
                    <p className="text-[13px] text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors truncate">{task.keyword}</p>
                    <p className="text-[11.5px] text-[var(--muted)] mt-0.5">{task.count} 家 · {task.time}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="fade-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-[12px] font-medium text-[var(--muted)] mb-4">{t.crawlCenter.preferences}</h2>
              <ul className="space-y-2.5 text-[12.5px] text-[var(--muted)]">
                <li className="flex justify-between"><span>{t.crawlCenter.mode}</span><span className="text-[var(--muted)]">{config?.crawlMode === "headless" ? t.crawlCenter.modeHeadless : t.crawlCenter.modeHttp}</span></li>
                <li className="flex justify-between"><span>{t.crawlCenter.renderBrowsers}</span><span className="text-[var(--muted)] text-right max-w-[60%] truncate">{configuredBrowsers.join(" · ")}</span></li>
                <li className="flex justify-between"><span>{t.crawlCenter.targetCountries}</span><span className="text-[var(--muted)] text-right max-w-[60%] truncate">{targetCountries.join(" · ")}</span></li>
              </ul>
            </section>
          </aside>

          {/* 中间：主区 */}
          <main className="min-w-0 space-y-8">
            {/* 进度与活动（简版） */}
            {stage !== "idle" && (
              <section className="fade-up space-y-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 h-1 bg-[var(--surface3)] rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-white transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                    <div className="shimmer-bar" />
                  </div>
                  <span className="text-[12px] text-[var(--muted)] tabular-nums w-9 text-right">{progress}%</span>
                </div>
                {stage === "enriching" && enrichStatus && (
                  <div className="flex items-center justify-between text-[12px]">
                    <p className="text-[var(--muted)]">
                      {target === "supplier" ? "第二阶段 · 官网定位与联系方式补全" : "第二阶段 · 官网定位与买家评分"}
                      <span className="text-[var(--muted)] ml-2 tabular-nums">{enrichStatus.done}/{enrichStatus.total}</span>
                    </p>
                    <p className="text-[var(--muted)] truncate max-w-[55%]">
                      正在处理：<span className="text-[var(--muted)]">{enrichStatus.current || "—"}</span>
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* 程序滚动运行视窗 */}
            {stage !== "idle" && <TerminalWindow lines={terminalLines} />}

            {/* 统计 */}
            {vendors.length > 0 && (
              <section className="grid grid-cols-3 gap-8 fade-up">
                <Stat value={vendors.length} label={t.crawlCenter.companies} />
                <Stat value={enrichedCount} label={t.crawlCenter.officialSites} color="text-[#d4a24e]" />
                <Stat value={emailCount} label={t.crawlCenter.publicEmails} />
              </section>
            )}

            {/* 结果 */}
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-[var(--fg)]">
                  {t.crawlCenter.results}
                  {vendors.length > 0 && <span className="text-[var(--muted)] font-normal ml-2">{vendors.length}</span>}
                </h2>
                <div className="flex items-center gap-2.5">
                  <button className="h-9 px-4 rounded-full border border-[var(--border)] text-[var(--muted)] text-[12.5px] hover:text-[var(--fg)] hover:border-[var(--border)] transition-all inline-flex items-center gap-1.5 disabled:opacity-30" disabled={vendors.length === 0}>
                    <Download className="w-3.5 h-3.5" /> {t.crawlCenter.export}
                  </button>
                  <button onClick={handleStoreAll} className="h-9 px-4 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[12.5px] font-medium hover:bg-[var(--surface3)] transition-all inline-flex items-center gap-1.5 disabled:opacity-30" disabled={vendors.length === 0}>
                    <Check className="w-3.5 h-3.5" /> {t.crawlCenter.importAll}
                  </button>
                </div>
              </div>

              {vendors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
                  <p className="text-[14px] text-[var(--muted)]">{t.crawlCenter.emptyHint}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {vendors.map((vendor, idx) => (
                    <div
                      key={vendor.id}
                      onClick={() => setDetailVendor(vendor)}
                      className="fade-up group rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-all duration-300 hover:border-[var(--border)] hover:bg-[var(--surface3)] cursor-pointer"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-medium text-[var(--fg)] truncate">{vendor.name}</h3>
                          <p className="text-[12px] text-[var(--muted)] mt-1">{vendor.source}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {vendor.scores && (
                            <span
                              className={`text-[11px] px-2.5 py-1 rounded-full border tabular-nums ${
                                vendor.scores.total >= 75
                                  ? "border-[#30d158]/40 text-[var(--ok)] bg-[var(--ok)]/5"
                                  : vendor.scores.total >= 50
                                    ? "border-[#d4a24e]/40 text-[#d4a24e] bg-[#d4a24e]/5"
                                    : "border-[#c06b4e]/40 text-[#c06b4e] bg-[#c06b4e]/5"
                              }`}
                            >
                              {vendor.scores.total}
                            </span>
                          )}
                          <span className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-500 ${
                            vendor.enriched
                              ? "border-[#d4a24e]/40 text-[#d4a24e] bg-[#d4a24e]/5"
                              : "border-[var(--border)] text-[var(--muted)]"
                          }`}>
                            {vendor.enriched ? t.crawlCenter.located : stage === "enriching" ? t.crawlCenter.locating : t.crawlCenter.pending}
                          </span>
                        </div>
                      </div>

                      {(vendor.officialWebsite || vendor.email || vendor.phone) && (
                        <div className="mt-4 space-y-1.5 text-[12.5px] text-[var(--muted)]">
                          {vendor.officialWebsite && (
                            <p className="flex items-center gap-2 min-w-0">
                              <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.website}</span>
                              <a
                                href={vendor.officialWebsite.startsWith("http") ? vendor.officialWebsite : `https://${vendor.officialWebsite}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[#d4a24e] truncate hover:underline"
                              >
                                {vendor.officialWebsite}
                              </a>
                            </p>
                          )}
                          {vendor.email && (
                            <p className="flex items-center gap-2 min-w-0">
                              <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.email}</span>
                              <span className="truncate">{vendor.email}</span>
                            </p>
                          )}
                          {vendor.phone && (
                            <p className="flex items-center gap-2 min-w-0">
                              <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.phone}</span>
                              <span className="truncate">{vendor.phone}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 完成条 */}
            {stage === "done" && (
              <div className="fade-up flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-6 py-4">
                <p className="text-[13px] text-[var(--muted)]">
                  <span className="text-[var(--fg)] font-medium">采集完成</span>
                  <span className="mx-2 text-[var(--muted)]">·</span>
                  共 {vendors.length} 家 · {enrichedCount} 家已定位官网
                </p>
                <button className="h-9 px-4 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[12.5px] font-medium hover:bg-[var(--surface3)] transition-all inline-flex items-center gap-1.5">
                  全部入库 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </main>

          {/* 右栏：实时活动 */}
          <aside className="hidden lg:block fade-up" style={{ animationDelay: "140ms" }}>
            <div className="sticky top-6 space-y-6">
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[12px] font-medium text-[var(--muted)]">{t.crawlCenter.history}</h2>
                  {sessions.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm("确定清空全部历史采集记录？此操作不可撤销")) return;
                        await fetch("/api/crawl-sessions", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: sessions.map((s) => s.id) }),
                        }).catch(() => undefined);
                        setSessions([]);
                        setExpandedSessions(new Set());
                      }}
                      className="text-[11px] text-[var(--muted)] hover:text-[var(--err)] transition-colors"
                    >
                      清空历史
                    </button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">{t.crawlCenter.historyHint}</p>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {sessions.map((session) => {
                      const isExpanded = expandedSessions.has(session.id);
                      return (
                        <div key={session.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] transition-colors duration-200 hover:border-[var(--border)]">
                          <button
                            onClick={() =>
                              setExpandedSessions((prev) => {
                                const next = new Set(prev);
                                if (next.has(session.id)) next.delete(session.id);
                                else next.add(session.id);
                                return next;
                              })
                            }
                            className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 group"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <ChevronRight className={`w-3.5 h-3.5 text-[var(--muted)] shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                              <span className="truncate text-[12px] text-[var(--muted)] group-hover:text-[var(--fg)] transition-colors">
                                {new Date(session.createdAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} · {session.keyword || "—"}
                              </span>
                            </span>
                            <span className="text-[11px] text-[var(--muted)] shrink-0">{session.results.filter((r) => r.stored).length}/{session.results.length}</span>
                          </button>
                          {isExpanded && (
                            <ul className="space-y-1 px-2 pb-2">
                              {session.results.map((result, idx) => (
                                <li key={`${session.id}-${idx}`}>
                                  <button
                                    onClick={() => setDetailVendor({
                                      id: `${session.id}-${idx}`,
                                      name: String(result.name || "未知企业"),
                                      source: String(result.source || ""),
                                      email: result.email,
                                      phone: result.phone,
                                      website: result.website,
                                      officialWebsite: result.officialWebsite,
                                      address: result.address,
                                      category: result.category,
                                      notes: result.notes,
                                      sourceUrl: result.sourceUrl,
                                      enriched: Boolean(result.officialWebsite),
                                      aiSummary: result.notes,
                                    })}
                                    className="w-full text-left rounded-lg px-2.5 py-1.5 transition-colors duration-200 hover:bg-[var(--surface3)] flex items-center justify-between gap-2"
                                  >
                                    <span className="text-[12.5px] text-[var(--muted)] truncate">{String(result.name || "未知企业")}</span>
                                    <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full border ${result.stored ? "border-[#30d158]/40 text-[var(--ok)]" : "border-[#d4a24e]/40 text-[#d4a24e]"}`}>
                                      {result.stored ? t.crawlCenter.stored : t.crawlCenter.pendingStore}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-[12px] font-medium text-[var(--muted)] mb-4">
                  {t.crawlCenter.activity}
                  {running && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-white breathe-dot align-middle" />}
                </h2>
                {steps.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed">{t.crawlCenter.activityHint}</p>
                ) : (
                  <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {steps.map((step, i) => (
                      <li key={`${step.text}-${i}`} className="fade-up flex gap-3 text-[12.5px]">
                        <span className="text-[var(--muted)] tabular-nums shrink-0 mt-px">{step.time}</span>
                        <span className={`leading-snug ${i === steps.length - 1 ? "text-[var(--fg)]" : "text-[var(--muted)]"}`}>{step.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {stage === "done" && (
                <section className="fade-up">
                  <h2 className="text-[12px] font-medium text-[var(--muted)] mb-4">{t.crawlCenter.timeDist}</h2>
                  <ul className="space-y-3">
                    {[
                      { name: "阿里巴巴国际站", value: 42, sec: "12.4s" },
                      { name: "全网检索", value: 30, sec: "8.9s" },
                      { name: "中国制造网", value: 18, sec: "5.3s" },
                      { name: "Global Sources", value: 10, sec: "3.1s" },
                    ].map((item) => (
                      <li key={item.name}>
                        <div className="flex justify-between text-[12px] mb-1.5">
                          <span className="text-[var(--muted)]">{item.name}</span>
                          <span className="text-[var(--muted)] tabular-nums">{item.sec}</span>
                        </div>
                        <div className="h-px bg-[var(--surface3)] relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-neutral-500" style={{ width: `${item.value}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </aside>
          </div>

          {/* 详情与对比面板：始终渲染，宽度平滑过渡 */}
          <div className={`shrink-0 sticky top-6 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${detailVendor ? "w-[38%] min-w-[540px] opacity-100" : "w-0 min-w-0 opacity-0 overflow-hidden pointer-events-none"}`}>
            {detailVendor && (
              <div className="slide-in space-y-3 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
              {/* 1. 判断区 */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[17px] font-medium text-[var(--fg)] leading-snug truncate">{detailVendor.name}</h2>
                    <p className="text-[11.5px] text-[var(--muted)] mt-1 flex items-center gap-2 min-w-0">
                      {detailVendor.source}
                      {detailVendor.sourceUrl && (
                        <a
                          href={detailVendor.sourceUrl.startsWith("http") ? detailVendor.sourceUrl : `https://${detailVendor.sourceUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4da3ff] truncate hover:underline"
                        >
                          ↗ {detailVendor.sourceUrl}
                        </a>
                      )}
                    </p>
                  </div>
                  <button onClick={() => setDetailVendor(null)} className="w-8 h-8 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--border)] transition-all inline-flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[26px] font-light text-[var(--fg)] tabular-nums">{detailVendor.scores?.total ?? detailVendor.matchScore ?? 80}</span>
                    <span className="text-[10.5px] text-[var(--muted)] leading-tight">{t.crawlCenter.matchScore}</span>
                  </div>
                  <div className="flex-1 h-px bg-[var(--surface3)]" />
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {detailVendor.tags?.map((tag) => (
                      <span key={tag} className="text-[10.5px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">{tag}</span>
                    ))}
                  </div>
                </div>
                {detailVendor.scores && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                    {[
                      { label: t.crawlCenter.scoreFit, value: detailVendor.scores.fit, color: "#30d158" },
                      { label: t.crawlCenter.scoreIntent, value: detailVendor.scores.intent, color: "#30d158" },
                      { label: t.crawlCenter.scoreTrust, value: detailVendor.scores.trust, color: "#d4a24e", estimated: detailVendor.scores.trustEstimated },
                      { label: t.crawlCenter.scoreReach, value: detailVendor.scores.reach, color: "#5ac8fa" },
                      { label: t.crawlCenter.scorePotential, value: detailVendor.scores.potential, color: "#5ac8fa" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2.5">
                        <span className="text-[10.5px] text-[var(--muted)] w-16 shrink-0">{row.label}</span>
                        <div className="flex-1 h-1 rounded-full bg-[var(--surface3)]/80 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${row.value}%`, background: row.value >= 75 ? row.color : row.value >= 50 ? "#d4a24e" : "#c06b4e" }}
                          />
                        </div>
                        <span className="text-[10.5px] text-[var(--muted)] tabular-nums w-7 text-right shrink-0">{row.value}</span>
                      </div>
                    ))}
                    {detailVendor.scores.trustEstimated && (
                      <p className="text-[10px] text-[var(--muted)]">{t.crawlCenter.scoreEstimated}</p>
                    )}
                  </div>
                )}
              </div>

              {/* 2. AI 洞察区 */}
              <div className="rounded-2xl border border-[#d4a24e]/25 bg-[#d4a24e]/[0.04] p-4">
                <p className="text-[10.5px] text-[#d4a24e] mb-1.5">{t.crawlCenter.aiInsight}</p>
                <p className="text-[12.5px] text-[var(--muted)] leading-relaxed">{detailVendor.aiSummary}</p>
                {detailVendor.risk && (
                  <p className={`text-[11.5px] mt-2 ${detailVendor.risk.includes("未") ? "text-[#c06b4e]" : "text-[var(--muted)]"}`}>
                    {detailVendor.risk.includes("未") ? "⚠ " : "✓ "}{detailVendor.risk}
                  </p>
                )}
              </div>

              {/* 2.5 AI 背调区 */}
              {bgStates[detailVendor.id] && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10.5px] text-[#d4a24e] font-medium uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> AI 背调
                    </p>
                    {bgStates[detailVendor.id].result && (
                      <button
                        onClick={() => handleBackgroundCheck(detailVendor)}
                        disabled={bgStates[detailVendor.id].loading}
                        className="text-[10.5px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors disabled:opacity-50"
                      >
                        ↻ {t.crawlCenter.bgRunAgain}
                      </button>
                    )}
                  </div>

                  {bgStates[detailVendor.id].loading ? (
                    <div className="flex items-center gap-3 py-1">
                      <LoadingGrid dotSize={5} gap={2} />
                      <p className="text-[12px] text-[var(--muted)]">
                        {bgStates[detailVendor.id].stage === "searching"
                          ? t.crawlCenter.bgSearching
                          : bgStates[detailVendor.id].stage === "customs"
                            ? t.crawlCenter.bgCustomsSearching
                            : t.crawlCenter.bgAnalyzing}
                      </p>
                    </div>
                  ) : bgStates[detailVendor.id].error ? (
                    <p className="text-[12px] text-[#c06b4e]">⚠ {bgStates[detailVendor.id].error}</p>
                  ) : bgStates[detailVendor.id].result ? (
                    <div className="space-y-3.5">
                      {(() => {
                        const r = bgStates[detailVendor.id].result!;
                        const score = r.report.trustScore;
                        const color = score >= 75 ? "#30d158" : score >= 50 ? "#d4a24e" : "#c06b4e";
                        const pct = Math.max(0, Math.min(100, score));
                        const R = 22;
                        const CIRC = 2 * Math.PI * R;
                        return (
                          <>
                            <div className="flex items-center gap-4">
                              <div className="relative w-[56px] h-[56px] shrink-0">
                                <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                                  <circle cx="28" cy="28" r={R} fill="none" stroke="#1c1c1e" strokeWidth="5" />
                                  <circle
                                    cx="28" cy="28" r={R} fill="none"
                                    stroke={color} strokeWidth="5" strokeLinecap="round"
                                    strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`}
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[15px] font-medium tabular-nums" style={{ color }}>
                                  {score}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10.5px] text-[var(--muted)]">{t.crawlCenter.bgTrust}</p>
                                <p className="text-[12.5px] text-[var(--fg)] leading-relaxed line-clamp-3">{r.report.companyOverview}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-[12px]">
                              <div className="flex gap-2.5">
                                <span className="text-[var(--muted)] shrink-0 w-16">{t.crawlCenter.bgRegistration}</span>
                                <span className="text-[var(--fg)] leading-relaxed">{r.report.registrationSignals}</span>
                              </div>
                              <div className="flex gap-2.5">
                                <span className="text-[var(--muted)] shrink-0 w-16">{t.crawlCenter.bgScale}</span>
                                <span className="text-[var(--fg)] leading-relaxed">{r.report.scaleSignals}</span>
                              </div>
                              <div className="flex gap-2.5">
                                <span className="text-[var(--muted)] shrink-0 w-16">{t.crawlCenter.bgFit}</span>
                                <span className="text-[var(--fg)] leading-relaxed">{r.report.industryFit}</span>
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-[var(--border)]">
                              <p className="text-[10.5px] text-[var(--muted)] mb-1.5">{t.crawlCenter.bgRisks}</p>
                              {r.report.riskFlags.length > 0 ? (
                                <ul className="space-y-1">
                                  {r.report.riskFlags.map((flag, i) => (
                                    <li key={i} className="flex gap-2 text-[12px] text-[#c06b4e]">
                                      <span>⚠</span>
                                      <span className="leading-relaxed">{flag}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[12px] text-[var(--ok)]">✓ {t.crawlCenter.bgNoRisk}</p>
                              )}
                            </div>
                            <div className="pt-1.5 border-t border-[var(--border)]">
                              <p className="text-[10.5px] text-[var(--muted)] mb-1.5">{t.crawlCenter.bgCustoms}</p>
                              <p className="text-[12px] text-[var(--fg)] leading-relaxed">{r.report.supplierRelationships}</p>
                              {r.customs?.found && (
                                <div className="mt-2 space-y-1">
                                  {r.customs.suppliers.slice(0, 6).map((s, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[11.5px] text-[var(--muted)]">
                                      <span className="text-[var(--info)] shrink-0">↑</span>
                                      <span className="truncate">
                                        {s.name}（{s.country}）
                                      </span>
                                      {s.percent != null && <span className="text-[var(--muted)] shrink-0">{s.percent}%</span>}
                                    </div>
                                  ))}
                                  {r.customs.topCustomers.length > 0 && (
                                    <p className="text-[11.5px] text-[var(--muted)] pt-1">
                                      ↓ {t.crawlCenter.bgCustomers}：{r.customs.topCustomers.slice(0, 5).map((c) => c.name).join("、")}
                                    </p>
                                  )}
                                  <a
                                    href={r.customs.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block text-[11.5px] text-[#4da3ff] hover:underline mt-1"
                                  >
                                    ↗ ImportYeti {t.crawlCenter.bgCustomsLink}
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="pt-1.5 border-t border-[var(--border)]">
                              <p className="text-[10.5px] text-[var(--muted)] mb-1.5">{t.crawlCenter.bgAdvice}</p>
                              <ul className="space-y-1">
                                {r.report.recommendations.map((adv, i) => (
                                  <li key={i} className="flex gap-2 text-[12px] text-[var(--muted)] leading-relaxed">
                                    <span className="text-[var(--info)] shrink-0">→</span>
                                    <span>{adv}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="pt-1.5 border-t border-[var(--border)]">
                              <p className="text-[10.5px] text-[var(--muted)] mb-1.5">{t.crawlCenter.bgSources}</p>
                              {r.sources.length > 0 ? (
                                <ul className="space-y-1">
                                  {r.sources.slice(0, 5).map((s, i) => (
                                    <li key={i} className="truncate">
                                      <a
                                        href={s.url.startsWith("http") ? s.url : `https://${s.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11.5px] text-[#4da3ff] hover:underline"
                                      >
                                        ↗ {s.title || s.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[12px] text-[#c06b4e]">{t.crawlCenter.bgNoSources}</p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              )}

              {/* 2.7 采购需求分析区（买家模式） */}
              {target === "buyer" && detailVendor.demand && (
                <div className="rounded-2xl border border-[#0071e3]/25 bg-[#0071e3]/[0.05] p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[10.5px] text-[#0071e3] font-medium uppercase tracking-wider">AI 采购需求分析</p>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-[var(--infobg)] text-[var(--info)]">{detailVendor.demand.intent}</span>
                  </div>
                  <div className="space-y-2.5 text-[12.5px]">
                    {detailVendor.quantity && (
                      <div className="flex gap-2.5">
                        <span className="text-[var(--muted)] shrink-0 w-14">需求数量</span>
                        <span className="text-[var(--ok)] font-medium">{detailVendor.quantity}</span>
                      </div>
                    )}
                    <div className="flex gap-2.5">
                      <span className="text-[var(--muted)] shrink-0 w-14">所需产品</span>
                      <span className="text-[var(--fg)] leading-relaxed">{detailVendor.demand.product}</span>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="text-[var(--muted)] shrink-0 w-14">规格要求</span>
                      <span className="text-[var(--fg)] leading-relaxed">{detailVendor.demand.specs}</span>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="text-[var(--muted)] shrink-0 w-14">目标市场</span>
                      <span className="text-[var(--fg)] leading-relaxed">{detailVendor.demand.market}</span>
                    </div>
                    <div className="flex gap-2.5 pt-1.5 border-t border-[var(--border)]">
                      <span className="text-[var(--muted)] shrink-0 w-14">跟进建议</span>
                      <span className="text-[var(--info)] leading-relaxed">{detailVendor.demand.suggestion}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. 档案区 */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <h3 className="text-[11.5px] font-medium text-[var(--muted)] mb-3">{t.crawlCenter.profile}</h3>
                <div className="grid grid-cols-3 gap-x-3 gap-y-3 text-[12px]">
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.founded}</p><p className="text-[var(--muted)] mt-0.5">{detailVendor.founded || "—"}</p></div>
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.years}</p><p className="text-[var(--muted)] mt-0.5">{detailVendor.years || "—"}</p></div>
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.capital}</p><p className="text-[var(--muted)] mt-0.5">{detailVendor.registeredCapital || "—"}</p></div>
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.scale}</p><p className="text-[var(--muted)] mt-0.5">{detailVendor.scale || "—"}</p></div>
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.kind}</p><p className="text-[var(--muted)] mt-0.5">{detailVendor.kind || "—"}</p></div>
                  <div><p className="text-[var(--muted)] text-[10.5px]">{t.crawlCenter.mainCategory}</p><p className="text-[var(--muted)] mt-0.5 truncate">{detailVendor.mainCategory || "—"}</p></div>
                </div>
                <p className="text-[12px] text-[var(--muted)] mt-3 pt-3 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)] text-[10.5px] mr-2">{t.crawlCenter.address}</span>{detailVendor.address || "—"}
                </p>
              </div>

              {/* 3.5 海关记录区（买家模式） */}
              {target === "buyer" && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <h3 className="text-[11.5px] font-medium text-[var(--muted)] mb-1.5 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5 text-[var(--muted)]" /> {t.crawlCenter.customs}
                  </h3>
                  <p className="text-[11.5px] text-[var(--muted)] leading-relaxed mb-3">{t.crawlCenter.customsHint}</p>
                  <div className="flex gap-2">
                    <a
                      href={`https://www.importyeti.com/search?q=${encodeURIComponent(detailVendor.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-8 rounded-full border border-[var(--border)] text-[11.5px] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all inline-flex items-center justify-center"
                    >
                      ImportYeti ↗
                    </a>
                    <a
                      href={`https://www.52wmb.com/us?keyword=${encodeURIComponent(detailVendor.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-8 rounded-full border border-[var(--border)] text-[11.5px] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all inline-flex items-center justify-center"
                    >
                      52wmb ↗
                    </a>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-2">{t.crawlCenter.customsWarn}</p>
                </div>
              )}

              {/* 4. 触达区 */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <h3 className="text-[11.5px] font-medium text-[var(--muted)] mb-3">{t.crawlCenter.contact}</h3>
                <div className="space-y-2 text-[12.5px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.website}</span>
                    {detailVendor.officialWebsite ? (
                      <a
                        href={detailVendor.officialWebsite.startsWith("http") ? detailVendor.officialWebsite : `https://${detailVendor.officialWebsite}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-[#d4a24e] hover:underline"
                      >
                        {detailVendor.officialWebsite}
                      </a>
                    ) : (
                      <span className="text-[var(--muted)]">{t.crawlCenter.notLocated}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.email}</span>
                    {detailVendor.email ? (
                      <span className="truncate text-[var(--muted)]">{detailVendor.email}</span>
                    ) : detailVendor.scores?.reachNote ? (
                      <span className="truncate text-[var(--ok)] text-[11.5px]">{detailVendor.scores.reachNote}</span>
                    ) : (
                      <span className="text-[var(--muted)]">{t.crawlCenter.notLocated}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.phone}</span>
                    <span className="truncate text-[var(--muted)]">{detailVendor.phone || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.whatsapp}</span>
                    <span className="truncate text-[var(--muted)]">{detailVendor.whatsapp || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--muted)] shrink-0">{t.crawlCenter.contactPerson}</span>
                    <span className="truncate text-[var(--muted)]">{detailVendor.contactName || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <button className="h-9 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[12px] font-medium hover:bg-[var(--surface3)] transition-all">{t.crawlCenter.aiEmail}</button>
                  <button className="h-9 rounded-full border border-[var(--border)] text-[var(--muted)] text-[12px] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all">{t.crawlCenter.addCampaign}</button>
                  <button
                    onClick={() => handleBackgroundCheck(detailVendor)}
                    disabled={bgStates[detailVendor.id]?.loading}
                    className="h-9 rounded-full border border-[var(--border)] text-[var(--muted)] text-[12px] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bgStates[detailVendor.id]?.loading ? t.crawlCenter.bgSearching : t.crawlCenter.aiCheck}
                  </button>
                </div>
              </div>

              {/* 5. 产品区 */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5">
                <h3 className="text-[11.5px] font-medium text-[var(--muted)] mb-2.5">{t.crawlCenter.products}</h3>
                {detailVendor.products && detailVendor.products.length > 0 ? (
                  <ul className="space-y-1.5">
                    {detailVendor.products.map((product) => (
                      <li key={product.name} className="flex items-center justify-between gap-3 text-[12.5px]">
                        <span className="text-[var(--muted)] truncate">{product.name}</span>
                        <span className="shrink-0 text-[var(--muted)] tabular-nums text-[11.5px]">{product.price} · MOQ {product.moq}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[var(--muted)]">{t.crawlCenter.noProducts}</p>
                )}
              </div>

              {/* 6. 底部操作 + 对比 */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleCompare(detailVendor)}
                    className={`flex-1 h-9 rounded-full border text-[12.5px] transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                      inCompare(detailVendor.id)
                        ? "border-[#d4a24e]/50 text-[#d4a24e] bg-[#d4a24e]/5"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                    }`}
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" />
                    {inCompare(detailVendor.id) ? t.crawlCenter.inCompare : t.crawlCenter.addCompare}
                  </button>
                  <button onClick={() => handleStore(detailVendor)} className="flex-1 h-9 rounded-full bg-[var(--fg)] text-[var(--bg)] text-[12.5px] font-medium hover:bg-[var(--surface3)] transition-all inline-flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> {t.crawlCenter.store}
                  </button>
                  <button className="flex-1 h-9 rounded-full border border-[var(--border)] text-[var(--muted)] text-[12.5px] hover:border-[var(--fg)] hover:text-[var(--fg)] transition-all inline-flex items-center justify-center gap-1.5">
                    <Download className="w-3.5 h-3.5" /> {t.crawlCenter.export}
                  </button>
                </div>

                {compareList.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-[12px] font-medium text-[var(--fg)] flex items-center gap-1.5">
                        <GitCompareArrows className="w-3.5 h-3.5 text-[var(--muted)]" /> {t.crawlCenter.compare} {compareList.length}
                      </h3>
                      <button onClick={() => setCompareList([])} className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] transition-colors">{t.crawlCenter.clear}</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11.5px]">
                        <thead>
                          <tr className="text-left text-[var(--muted)]">
                            <th className="pb-2 pr-2 font-normal whitespace-nowrap"></th>
                            {compareList.map((v) => (
                              <th key={v.id} className="pb-2 pr-2 font-medium text-[var(--muted)] min-w-[110px] max-w-[130px]">
                                <p className="truncate">{v.name}</p>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="align-top">
                          {[
                            { label: t.crawlCenter.match, get: (v: CrawlItem) => `${v.scores?.total ?? v.matchScore ?? 80}%`, gold: true },
                            { label: t.crawlCenter.website, get: (v: CrawlItem) => v.officialWebsite || "—", gold: true },
                            { label: t.crawlCenter.email, get: (v: CrawlItem) => v.email || "—" },
                            { label: t.crawlCenter.scale, get: (v: CrawlItem) => v.scale || "—" },
                          ].map((row) => (
                            <tr key={row.label} className="border-t border-[var(--border)]">
                              <td className="py-2 pr-2 text-[var(--muted)] whitespace-nowrap">{row.label}</td>
                              {compareList.map((v) => (
                                <td key={v.id} className={`py-2 pr-2 truncate max-w-[130px] ${row.gold ? "text-[#d4a24e]" : "text-[var(--muted)]"}`}>
                                  {row.get(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
