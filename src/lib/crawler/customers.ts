import * as cheerio from "cheerio";
import { closeHeadlessBrowser, DEFAULT_BROWSER_ID, fetchRenderedHtml, fetchRenderedHtmlWithVerify, parseDuckDuckGoHtml } from "./headless";
import {
  extractBusinessEmail,
  extractPhone,
  isDirectorySite,
  isNonOfficialDomain,
  isPlatformDomain,
  extractCoreWords,
  scoreCandidate,
  domainHasOnlyCity,
  normalizeUrl,
  extractAddressText,
  sleep,
} from "./utils";
import { fetchHtml } from "./index";
import { translateToEnglish } from "../ai/translate";

export interface ParsedCustomerLead {
  name: string;
  company: string;
  contactName?: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  website?: string;
  address?: string;
  quantity?: string;
  source: string;
  sourceUrl: string;
  notes: string;
  score?: number;
}

export interface CustomerCrawlOptions {
  mode?: "http" | "headless";
  userId?: string;
  marketMode?: "domestic" | "overseas" | "global";
  buyerSources?: string[];
}

// 国家词表：用于在文本中识别客户所属国家（支持别名）
const COUNTRY_ALIASES: Array<{ country: string; patterns: RegExp }> = [
  { country: "Germany", patterns: /germany|german|deutschland|\bde\b/i },
  { country: "USA", patterns: /\busa\b|united states|america|\binc\./i },
  { country: "Mexico", patterns: /mexico|mexican/i },
  { country: "Brazil", patterns: /brazil|brazilian|brasil/i },
  { country: "UAE", patterns: /\buae\b|dubai|united arab emirates|emirates/i },
  { country: "UK", patterns: /\buk\b|united kingdom|britain|british|london|england/i },
  { country: "France", patterns: /france|french|paris/i },
  { country: "Spain", patterns: /spain|spanish|españa|madrid/i },
  { country: "Italy", patterns: /italy|italian|milano|milan/i },
  { country: "Netherlands", patterns: /netherlands|holland|dutch|amsterdam/i },
  { country: "Poland", patterns: /poland|polish/i },
  { country: "Turkey", patterns: /turkey|turkish|türkiye|istanbul/i },
  { country: "India", patterns: /india|indian|mumbai|delhi/i },
  { country: "Vietnam", patterns: /vietnam|vietnamese/i },
  { country: "Thailand", patterns: /thailand|thai|bangkok/i },
  { country: "Indonesia", patterns: /indonesia|indonesian|jakarta/i },
  { country: "Malaysia", patterns: /malaysia|malaysian|kuala lumpur/i },
  { country: "Philippines", patterns: /philippines|filipino|manila/i },
  { country: "Singapore", patterns: /singapore|singaporean/i },
  { country: "Japan", patterns: /japan|japanese|tokyo|osaka/i },
  { country: "South Korea", patterns: /south korea|korea|korean|seoul/i },
  { country: "Australia", patterns: /australia|australian|sydney|melbourne/i },
  { country: "Canada", patterns: /canada|canadian|toronto/i },
  { country: "Russia", patterns: /russia|russian|moscow/i },
  { country: "South Africa", patterns: /south africa|johannesburg|cape town/i },
  { country: "Egypt", patterns: /egypt|egyptian|cairo/i },
  { country: "Saudi Arabia", patterns: /saudi arabia|saudi|riyadh/i },
  { country: "Chile", patterns: /chile|chilean|santiago/i },
  { country: "Colombia", patterns: /colombia|colombian|bogota/i },
  { country: "Peru", patterns: /peru|peruvian|lima/i },
  { country: "Argentina", patterns: /argentina|argentine/i },
];

export async function crawlCustomerLeads(
  keyword: string,
  countries: string[],
  maxResults = 10,
  options: CustomerCrawlOptions = {}
): Promise<{ leads: ParsedCustomerLead[]; source: string; error?: string; translated?: { original: string; english: string } | null }> {
  let translated: { original: string; english: string } | null = null;
  let effectiveKeyword = keyword;
  if (/[\u4e00-\u9fa5]/.test(keyword)) {
    const english = await translateToEnglish(keyword, options.userId);
    if (english && english !== keyword.trim()) {
      translated = { original: keyword.trim(), english };
      effectiveKeyword = english;
    }
  }
  // 国内网络下 HTTP 搜索引擎（Bing/百度/搜狗/360）对海外买家英文查询返回
  // 词典/天气等垃圾结果，无法发现海外客户；统一走无头 DDG 国际索引。
  const result = await crawlCustomerLeadsHeadless(effectiveKeyword, countries, maxResults, {
    buyerSources: options.buyerSources?.filter((s) => s && s !== "auto") || [],
    marketMode: options.marketMode,
  });
  result.translated = translated;
  return result;
}

// ---------------- 第二阶段：官网定位 + 联系方式补全 + 买家质量评分 ----------------

export async function enrichCustomerLeadsHttp(
  leads: ParsedCustomerLead[]
): Promise<ParsedCustomerLead[]> {
  const result: ParsedCustomerLead[] = [];
  for (let i = 0; i < leads.length; i += 3) {
    const batch = leads.slice(i, i + 3);
    const enrichedBatch = await Promise.all(batch.map((lead) => enrichLeadHttp(lead)));
    result.push(...enrichedBatch);
    await sleep(200);
  }
  return result;
}

async function enrichLeadHttp(lead: ParsedCustomerLead): Promise<ParsedCustomerLead> {
  const updated: ParsedCustomerLead = { ...lead };
  // TradeWheel 线索为求购需求描述（无公司名），跳过官网定位避免误配
  if (/TradeWheel/i.test(lead.source)) {
    updated.score = computeLeadScore(updated);
    return updated;
  }
  try {
    const coreWords = extractCoreWords(lead.company);

    // 1. Bing RSS 搜公司名 → 官网候选
    const query = `"${lead.company}"`;
    let candidates: Array<{ title: string; url: string }> = [];
    try {
      const html = await fetchHtml(
        `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`,
        {},
        1
      );
      const $ = cheerio.load(html, { xmlMode: true });
      $("item").each((_, item) => {
        const title = $(item).find("title").text().replace(/\s+/g, " ").trim();
        const url = $(item).find("link").text().trim();
        if (title && /^https?:\/\//i.test(url)) candidates.push({ title, url });
      });
    } catch {
      candidates = [];
    }

    candidates = candidates
      .filter((c) => !isNonOfficialDomain(c.url))
      .filter((c) => !isPlatformDomain(c.url))
      .filter((c) => !isDirectorySite(c.url))
      .filter((c) => !domainHasOnlyCity(c.url, coreWords))
      .sort((a, b) => scoreCandidate(b.url, coreWords) - scoreCandidate(a.url, coreWords));

    // 2. 逐个核验候选（域名品牌词命中或站内标题含公司词）
    for (const candidate of candidates.slice(0, 3)) {
      const site = await extractContactFromLeadSite(updated, candidate.url, coreWords);
      if (site) {
        updated.website = normalizeUrl(candidate.url) || undefined;
        updated.email = site.email || updated.email;
        updated.phone = site.phone || updated.phone;
        updated.address = site.address || updated.address;
        updated.notes = `${updated.notes}；官网定位: ${candidate.url}`;
        break;
      }
    }
  } catch {
    // 补全失败保持原样
  }

  updated.score = computeLeadScore(updated);
  return updated;
}

async function extractContactFromLeadSite(
  lead: ParsedCustomerLead,
  siteUrl: string,
  coreWords: string[]
): Promise<{ email?: string; phone?: string; address?: string } | null> {
  try {
    const html = await fetchHtml(siteUrl, {}, 1);
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");

    // 域名品牌词命中 → 直接采信
    let domainMatched = false;
    try {
      const hostname = new URL(siteUrl).hostname.toLowerCase();
      domainMatched = coreWords.some((word) => hostname.includes(word));
    } catch {
      domainMatched = false;
    }

    // 站内文本核验：标题/描述包含公司核心词
    const haystack = [
      $("title").text(),
      $("meta[property='og:site_name']").attr("content") || "",
      $("meta[name='description']").attr("content") || "",
    ].join(" ").toLowerCase();
    let titleMatched = 0;
    for (const word of coreWords) {
      if (haystack.includes(word)) titleMatched += 1;
    }
    const textMatched = titleMatched >= Math.min(2, Math.max(1, coreWords.length));

    if (!domainMatched && !textMatched) return null;

    const email = extractBusinessEmail(text);
    const phone = extractPhone(text);
    const address = extractAddressText(text);

    if (!email && !phone) {
      const contact = await extractContactFromLeadContactPage(siteUrl);
      if (contact.email) return { ...contact, address: address || contact.address };
      if (contact.phone) return { ...contact, address: address || contact.address };
      return { address };
    }
    return { email, phone, address };
  } catch {
    return null;
  }
}

async function extractContactFromLeadContactPage(
  siteUrl: string
): Promise<{ email?: string; phone?: string; address?: string }> {
  const base = siteUrl.replace(/\/+$/, "");
  for (const path of ["/contact", "/contact-us", "/contactus", "/Contact.html", "/contact.html", "/ContactUs.html"]) {
    try {
      const html = await fetchHtml(base + path, {}, 1);
      const text = cheerio.load(html)("body").text().replace(/\s+/g, " ");
      const email = extractBusinessEmail(text);
      const phone = extractPhone(text);
      if (email || phone) {
        return { email, phone, address: extractAddressText(text) };
      }
    } catch {
      // 尝试下一个路径
    }
  }
  return {};
}

function computeLeadScore(lead: ParsedCustomerLead): number {
  let score = 1;
  if (lead.website) score += 1.5;
  if (lead.email) score += 1;
  if (lead.phone) score += 0.5;
  if (lead.country) score += 0.5;
  if (/(importer|import|distributor|distribut|wholesale|buyer|purchasing|sourcing|procurement)/i.test(`${lead.name} ${lead.notes} ${lead.website || ""}`)) score += 0.5;
  return Math.min(5, Math.round(score * 10) / 10);
}

// ---------------- TradeWheel 买家需求源 ----------------

const tradewheelCache = new Map<string, { expires: number; leads: ParsedCustomerLead[] }>();

// 从求购标题中提取需求数量：如 "1000 pcs"、"100,000 Pieces"、"50 tons"
function extractQuantity(title: string): string | undefined {
  const match = title.match(
    /(\d[\d,]*(?:\.\d+)?)\s*(pcs|pieces|units|pairs|sets|tons|tonnes|kg|kgs|kilograms|meters?|mts?|rolls|cartons|dozens?|containers|ft|mt)\b/i
  );
  if (!match) return undefined;
  return `${match[1]} ${match[2].toLowerCase()}`;
}

// 抓取 TradeWheel 求购详情页全文：换供原因、采购描述、数量、公司信息等公开信号
async function fetchTradewheelDetailText(href: string): Promise<string | null> {
  try {
    const url = href.startsWith("http") ? href : `https://www.tradewheel.com${href}`;
    const html = await fetchRenderedHtmlWithVerify(url, DEFAULT_BROWSER_ID, true, 15_000, 12_000);
    const $ = cheerio.load(html);
    $("script, style, noscript, header, footer, nav, form, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();
    if (!text || text.length < 60) return null;
    const descIdx = text.search(/product description|description|details? about|post details|requirement|sourcing requirement/i);
    const core = descIdx >= 0 ? text.slice(descIdx) : text;
    return core.slice(0, 1400);
  } catch {
    return null;
  }
}

export async function crawlTradeWheelBuyers(
  keyword: string,
  countries: string[],
  maxResults: number
): Promise<ParsedCustomerLead[]> {
  return crawlTradeWheelBuyersInner(keyword, countries, maxResults);
}

async function crawlTradeWheelBuyersInner(
  keyword: string,
  countries: string[],
  maxResults: number
): Promise<ParsedCustomerLead[]> {
  // 结果缓存：10 分钟内重复采集同一关键词直接复用，减少 Cloudflare 触发频率
  const cacheKey = `kw:${keyword.trim().toLowerCase()}`;
  const cached = tradewheelCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.leads.slice(0, maxResults);
  }

  const leads: ParsedCustomerLead[] = [];
  const seen = new Set<string>();

  const pushLead = (title: string, href: string) => {
    if (leads.length >= maxResults) return;
    const name = title.slice(0, 120);
    if (seen.has(href)) return;
    seen.add(href);
    const quantity = extractQuantity(title);
    leads.push({
      name,
      company: name,
      country: findCountry(title, countries),
      industry: keyword,
      quantity,
      source: "TradeWheel 买家需求",
      sourceUrl: href,
      notes: `B2B 平台公开求购需求：${name}${quantity ? `（需求数量：${quantity}）` : ""}。点击查看详情可登录平台获取联系方式。来源: ${href}`,
    });
  };

  try {
    // 核心入口：站内买家搜索（buy offer），结果即买家求购需求
    const searchUrl = `https://www.tradewheel.com/search/buyoffer?keyword=${encodeURIComponent(keyword)}`;
    try {
      const html = await fetchRenderedHtmlWithVerify(searchUrl, DEFAULT_BROWSER_ID, true, 15_000, 12_000);
      const $ = cheerio.load(html);
      $("a[href*='/buyers/']").each((_, el) => {
        const href = $(el).attr("href") || "";
        const title = $(el).text().replace(/\s+/g, " ").trim();
        if (!/\/buyers\/[^/]+\/\d+\/?$/.test(href) || title.length < 8) return;
        if (/请稍候|one moment|just a moment|not found/i.test(title)) return;
        pushLead(title, href);
      });
    } catch {
      // 搜索页失败继续目录页兜底
    }

    // 目录页兜底（平台分类 slug 命中时）
    if (leads.length < maxResults) {
      const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const dirUrls = [
        `https://www.tradewheel.com/buyers/${slug}/`,
        `https://www.tradewheel.com/buyers/${slug}s/`,
      ];
      for (const country of countries.filter(Boolean).slice(0, 2)) {
        const c = country.toLowerCase().replace(/\s+/g, "-");
        dirUrls.push(
          `https://www.tradewheel.com/buyers/${slug}/${c}/`,
          `https://www.tradewheel.com/buyers/${slug}s/${c}/`
        );
      }
      for (const dirUrl of dirUrls) {
        if (leads.length >= maxResults) break;
        try {
          const dirHtml = await fetchRenderedHtmlWithVerify(dirUrl, DEFAULT_BROWSER_ID, true, 10_000, 10_000);
          const $ = cheerio.load(dirHtml);
          if (/not found/i.test($("title").text())) continue;
          $("a[href*='/buyers/']").each((_, el) => {
            const href = $(el).attr("href") || "";
            const title = $(el).text().replace(/\s+/g, " ").trim();
            if (!/\/buyers\/[^/]+\/\d+\/?$/.test(href) || title.length < 8) return;
            if (/请稍候|one moment|just a moment|not found/i.test(title)) return;
            pushLead(title, href);
          });
        } catch {
          continue;
        }
      }
    }
  } catch {
    // TradeWheel 不可用时静默跳过
  }

  // 补充求购详情全文（最多前 5 条，失败跳过）：换供原因/采购描述等关键信号并入 notes
  for (const lead of leads.slice(0, 5)) {
    const detail = await fetchTradewheelDetailText(lead.sourceUrl || "");
    if (detail) {
      lead.notes = `${lead.notes}\n\n【求购详情全文】${detail}`;
    }
  }

  tradewheelCache.set(cacheKey, { expires: Date.now() + 10 * 60_000, leads });
  return leads;
}

// ---------------- ExportersIndia 买家名录源 ----------------

const exportersCache = new Map<string, { expires: number; leads: ParsedCustomerLead[] }>();

function exportersSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^(buy|buying|need|needed|required|requirement|wanted|want|looking|search)-/, "");
}

// 从静态买家列表页提取线索：DOM 解析（标题 h3 / 城市 lead-location / _info_p 字段）
function parseExportersIndiaHtml(html: string, url: string, source: string): ParsedCustomerLead[] {
  const $ = cheerio.load(html);
  const leads: ParsedCustomerLead[] = [];
  const seen = new Set<string>();
  $(".buyer_lead > li").each((_, el) => {
    const rawTitle = $(".lead_det-title h3", el).text().trim().replace(/\s+/g, " ");
    const title = rawTitle.replace(/^Looking for\s+/i, "").trim();
    if (!title || title.length < 4 || seen.has(title)) return;
    seen.add(title);

    const location = $(".lead-location", el).text().trim() || "India";
    const desc = $(".other_info", el).text().replace(/\s+/g, " ").trim();
    const info: Record<string, string> = {};
    $("._info_p li", el).each((_, li) => {
      const key = $("b", li).text().trim().replace(/\s+/g, " ");
      const val = $("span", li).text().trim().replace(/\s+/g, " ");
      if (key && val) info[key] = val;
    });
    const buys: string[] = [];
    $(".buys-info-list li", el).each((_, li) => {
      const lbl = $(".lbl", li).text().trim();
      const val = $(".val", li).text().trim();
      if (!lbl || !val || /engagement|requirement|replies|messages/i.test(lbl)) return;
      buys.push(`${lbl} ${val}`);
    });

    const details: string[] = [];
    if (info["Quantity"]) details.push(`需求数量：${info["Quantity"]}`);
    if (info["Frequency"]) details.push(`采购频次：${info["Frequency"]}`);
    if (info["Requirement"]) details.push(`时效：${info["Requirement"]}`);
    if (info["payment mode"] || info["Payment Mode"]) details.push(`付款方式：${info["payment mode"] || info["Payment Mode"]}`);
    if (info["material"] || info["Material"]) details.push(`材质：${info["material"] || info["Material"]}`);
    if (buys.length) details.push(`现有采购：${buys.join("；")}`);
    if (desc) details.push(desc);
    if (info["Mobile No."]) details.push(`手机：${info["Mobile No."]}（尾号隐藏，注册可见完整）`);

    leads.push({
      name: title,
      company: title,
      contactName: info["Buyer Name"] || undefined,
      phone: info["Mobile No."] || undefined,
      country: location,
      address: location,
      quantity: info["Quantity"] || undefined,
      source,
      sourceUrl: url,
      notes: details.length ? details.join("。") : "B2B 平台公开买家求购需求",
    });
  });
  return leads;
}

async function crawlExportersIndiaBuyers(
  keyword: string,
  maxResults: number
): Promise<ParsedCustomerLead[]> {
  const cacheKey = `ex:${keyword.trim().toLowerCase()}`;
  const cached = exportersCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.leads.slice(0, maxResults);

  const source = "ExportersIndia 买家名录";
  const leads: ParsedCustomerLead[] = [];
  const seen = new Set<string>();
  const slug = exportersSlug(keyword);
  const urls: string[] = [];
  const trySlugs: string[] = [];
  if (slug) trySlugs.push(slug);
  // 分类页常用复数（hang-tag 410，hang-tags 有效）
  if (slug && !slug.endsWith("s")) trySlugs.push(`${slug}s`);
  // 连写词拆分变体（hangtag -> hang-tag / hang-tags），平台分类页不做连写模糊匹配
  if (slug && !slug.includes("-")) {
    for (const suffix of ["tags", "labels", "cards", "boxes", "bags", "rolls", "tapes", "stickers", "sheets", "papers", "films", "holders", "stands", "racks", "tag", "label", "card", "box", "bag"]) {
      if (slug.toLowerCase().endsWith(suffix) && slug.length > suffix.length + 2) {
        const base = slug.slice(0, -suffix.length);
        trySlugs.push(`${base}-${suffix}`, `${base}-${suffix}s`);
        break;
      }
    }
  }
  for (const s of trySlugs) urls.push(`https://www.exportersindia.com/buyers/${s}.htm`);
  urls.push("https://www.exportersindia.com/buyers/fashion-apparel.htm");

  for (const url of urls) {
    if (leads.length >= maxResults) break;
    try {
      const html = await fetchHtml(url, {}, 1);
      const $ = cheerio.load(html);
      if (/page not found|page removed|410/i.test($("title").text())) continue;
      const parsed = parseExportersIndiaHtml(html, url, source);
      for (const lead of parsed) {
        if (leads.length >= maxResults) break;
        const key = lead.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        leads.push(lead);
      }
      // 第二页
      if (leads.length < maxResults) {
        try {
          const page2 = await fetchHtml(url.replace(/\.htm$/, "-2.htm"), {}, 1);
          const $2 = cheerio.load(page2);
          if (!/page not found|page removed|410/i.test($2("title").text())) {
            const parsed2 = parseExportersIndiaHtml(page2, url, source);
            for (const lead of parsed2) {
              if (leads.length >= maxResults) break;
              const key = lead.name.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              leads.push(lead);
            }
          }
        } catch {
          // 第二页失败忽略
        }
      }
    } catch {
      continue;
    }
  }

  exportersCache.set(cacheKey, { expires: Date.now() + 10 * 60_000, leads });
  return leads.slice(0, maxResults);
}

// ---------------- 无头模式（DDG 国际检索） ----------------

async function crawlCustomerLeadsHeadless(
  keyword: string,
  countries: string[],
  maxResults: number,
  options: { buyerSources?: string[]; marketMode?: "domestic" | "overseas" | "global" } = {}
): Promise<{ leads: ParsedCustomerLead[]; source: string; error?: string; translated?: { original: string; english: string } | null }> {
  const source = "无头浏览器公开客户检索 (DuckDuckGo)";
  const buyerSources = options.buyerSources || [];

  // 市场模式：domestic 只保留国内线索；overseas 排除中国线索；global 不限
  const marketMode = options.marketMode || "global";

  const leads: ParsedCustomerLead[] = [];

  // 勾选了平台时只跑勾选平台；未勾选时走原来自动检索（TradeWheel + DDG/Bing）
  if (buyerSources.length > 0) {
    const picked: ParsedCustomerLead[] = [];
    if (buyerSources.some((s) => /tradewheel/i.test(s))) {
      picked.push(...(await crawlTradeWheelBuyers(keyword, countries, Math.min(maxResults, 8))));
    }
    if (buyerSources.some((s) => /exportersindia|exporters/i.test(s))) {
      picked.push(...(await crawlExportersIndiaBuyers(keyword, maxResults)));
    }
    const filtered = picked.filter((lead) => {
      if (marketMode === "overseas") return !/china|中国|hong kong|shenzhen|guangzhou|shanghai|ningbo|yiwu/i.test(`${lead.address || ""} ${lead.country || ""} ${lead.notes || ""}`);
      if (marketMode === "domestic") return /china|中国|hong kong/i.test(`${lead.address || ""} ${lead.country || ""}`);
      return true;
    });
    const merged = deduplicateLeads(filtered).slice(0, maxResults);
    for (const lead of merged) lead.score = computeLeadScore(lead);
    return {
      leads: merged,
      source: `买家平台直采（${buyerSources.join("、")}）`,
      error: merged.length === 0 ? `勾选平台未返回可核验线索（${buyerSources.join("、")}）` : undefined,
    };
  }

  const targets = countries.filter(Boolean).slice(0, 2);
  const queries: string[] = [];
  for (const country of targets) {
    queries.push(`${keyword} importers in ${country}`);
    queries.push(`${keyword} buyers in ${country}`);
  }
  queries.push(`${keyword} buying leads`);
  queries.push(`${keyword} sourcing demand`);
  if (queries.length === 0) {
    queries.push(`${keyword} importer distributor buyer company`);
  }

  const candidates: Array<{ title: string; url: string; snippet: string }> = [];
  const seenCandidates = new Set<string>();

  try {
    // TradeWheel 买家需求优先（公开 B2B 求购页，真实买家线索，防后续限流）
    const tradewheelLeads = await crawlTradeWheelBuyers(keyword, countries, Math.min(maxResults, 8));
    leads.push(...tradewheelLeads);

    let ddgOk = false;
    for (const query of queries) {
      if (candidates.length >= maxResults * 4) break;

      // DDG 无头渲染（国际索引）
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      try {
        const html = await fetchRenderedHtml(searchUrl, DEFAULT_BROWSER_ID, [], true);
        ddgOk = true;
        const found = parseDuckDuckGoHtml(html).filter((candidate) => !isBlockedUrl(candidate.url));
        for (const candidate of found) {
          if (!seenCandidates.has(candidate.url)) {
            seenCandidates.add(candidate.url);
            candidates.push(candidate);
          }
        }
      } catch {
        // 单个查询失败继续下一个
      }
      await sleep(300);

      // Bing 国际 RSS 补充（HTTP 直取，代理分流，无需浏览器渲染）
      try {
        const rssHtml = await fetchHtml(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {}, 1);
        const $rss = cheerio.load(rssHtml, { xmlMode: true });
        $rss("item").each((_, el) => {
          const title = $rss("title", el).text().replace(/\s+/g, " ").trim();
          const link = $rss("link", el).text().trim();
          const desc = $rss("description", el).text().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (!link || !title) return;
          if (isBlockedUrl(link) || seenCandidates.has(link)) return;
          seenCandidates.add(link);
          candidates.push({ title, url: link, snippet: desc.slice(0, 400) });
        });
      } catch {
        // Bing 失败忽略
      }
    }

    if (!ddgOk && leads.length === 0 && candidates.length === 0) {
      return {
        leads: [],
        source,
        error: "搜索引擎全部不可达（请确认 VPN 代理已开启且 Chrome/Edge/Firefox 已安装）",
      };
    }

    // 排除非买家页面（市场报告/目录列表/趋势分析等）
    const usable = candidates.filter((c) => !isNonBuyerPage(c.title, c.url));

    for (const candidate of usable.slice(0, Math.min(usable.length, 15))) {
      if (leads.length >= maxResults) break;
      const lead = await inspectCustomerPage(candidate.url, candidate.title, candidate.snippet, keyword, countries, source);
      if (lead) leads.push(lead);
    }

    const filtered = leads.filter((lead) => {
      if (marketMode === "overseas") return !/china|中国|hong kong|shenzhen|guangzhou|shanghai|ningbo|yiwu/i.test(`${lead.address || ""} ${lead.country || ""} ${lead.notes || ""}`);
      if (marketMode === "domestic") return /china|中国|hong kong/i.test(`${lead.address || ""} ${lead.country || ""}`);
      return true;
    });
    const merged = deduplicateLeads(filtered).slice(0, maxResults);
    for (const lead of merged) lead.score = computeLeadScore(lead);
    return {
      leads: merged,
      source,
      error: merged.length === 0 ? "无头浏览器已完成公开页面渲染，但没有找到可核验的企业客户线索" : undefined,
    };
  } catch (error: unknown) {
    return {
      leads: [],
      source,
      error: error instanceof Error ? error.message : "无头浏览器客户采集失败",
    };
  } finally {
    await closeHeadlessBrowser();
  }
}

async function inspectCustomerPage(
  url: string,
  title: string,
  snippet: string,
  keyword: string,
  countries: string[],
  source: string
): Promise<ParsedCustomerLead | null> {
  try {
    const html = await fetchRenderedHtml(url, DEFAULT_BROWSER_ID, [], true);
    const $ = cheerio.load(html);
    const pageText = `${$("body").text()} ${snippet}`.replace(/\s+/g, " ");
    const organizationName = $("meta[property='og:site_name']").attr("content") || $("title").text() || title;
    const company = cleanLeadName(organizationName);
    if (!isLikelyBusinessName(company, pageText) || isBlockedUrl(url)) return null;

    return {
      name: company,
      company,
      country: findCountry(`${company} ${pageText}`, countries),
      industry: keyword,
      email: extractBusinessEmail(pageText),
      phone: extractPhone(pageText),
      website: normalizeUrl(url) || undefined,
      source,
      sourceUrl: url,
      notes: `公开企业页面线索，需人工核验后联系。来源: ${url}`,
    };
  } catch {
    return null;
  }
}

function isLikelyBusinessName(name: string, context: string): boolean {
  if (name.length < 3 || name.length > 160) return false;
  if (/^(home|首页|products?|搜索|login|sign in|untitled|menu|about us|contact us|welcome|index|undefined)$/i.test(name)) return false;
  if (/(back button|search icon|filter icon|order button|shop now|buy now|add to cart|my account|register)/i.test(name)) return false;
  if (/(attention required|请稍候|security check|please enable javascript|one moment|just a moment|access denied|checking your browser|verify you are human)/i.test(name)) return false;
  if (/(^|\s)(google|amazon|wikipedia|brand usa|visit the usa|youtube|facebook|linkedin|twitter)(\s|$)/i.test(name)) return false;
  return isBusinessResult(`${name} ${context}`);
}

function deduplicateLeads(leads: ParsedCustomerLead[]): ParsedCustomerLead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = `${lead.company.toLowerCase()}|${lead.email?.toLowerCase() || lead.sourceUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanLeadName(title: string): string {
  return title.replace(/\s*[|｜·-].*$/, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function isBusinessResult(value: string): boolean {
  return /(company|corp|inc\.?|ltd\.?|llc| GmbH|import|export|distributor|buyer|supplier|manufacturer|wholesale|sourcing|采购|进口|经销|公司|有限公司|工业品|供应链|electronics|solutions|group)/i.test(value);
}

function isBlockedUrl(value: string): boolean {
  return isNonOfficialDomain(value) || isPlatformDomain(value) || isDirectorySite(value);
}

// 排除非买家页面：市场报告、趋势分析、目录列表、文章聚合等，保留真实企业官网/求购页
function isNonBuyerPage(title: string, url: string): boolean {
  const text = `${title} ${url}`.toLowerCase();
  if (/(market\s+size|market\s+share|market\s+research|forecast|insights?|trends?|list\s+of|top\s+\d+|directory|statistics|outlook|growth|report\b|analysis|research\s+report)/.test(text)) return true;
  if (/linkedin\.com\/pulse\//.test(text)) return true;
  if (/\.pdf$/.test(url.toLowerCase())) return true;
  return false;
}

function findCountry(value: string, countries: string[]): string | undefined {
  const text = value.toLowerCase();
  for (const { country, patterns } of COUNTRY_ALIASES) {
    if (patterns.test(text)) return country;
  }
  return countries.find((country) => country && text.includes(country.toLowerCase()));
}