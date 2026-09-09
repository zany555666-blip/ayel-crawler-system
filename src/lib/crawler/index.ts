import * as cheerio from "cheerio";
import { ALL_SOURCES, CaptchaRequiredError, CrawlerSource, ParsedVendor, SOURCE_ALIASES, HEADLESS_SOURCES } from "./sources";
import {
  fetchRenderedHtml,
  parseDuckDuckGoHtml,
  closeAllHeadlessBrowsers,
  openManualVerification,
  fetchCurrentFromManualBrowser,
  closeManualVerification,
  DEFAULT_BROWSER_ID,
  getBrowserLabel,
  RenderedCandidate,
} from "./headless";
import {
  cleanCompanyName,
  deduplicateVendors,
  domainHasOnlyCity,
  extractAddressText,
  extractBusinessEmail,
  extractCoreWords,
  extractPhone,
  isDirectorySite,
  isLikelyCompanyTitle,
  isNonOfficialDomain,
  isPlatformDomain,
  normalizeUrl,
  scoreCandidate,
  sleep,
} from "./utils";

export interface CrawlResult {
  vendors: ParsedVendor[];
  sourceLabel: string;
  totalFound: number;
  error?: string;
  captcha?: { url: string; browserId: string; platform: string };
}

export type CrawlMode = "http" | "headless";

interface CrawlOptions {
  sources?: string[];
  pages?: number;
  delayMs?: number;
  mode?: CrawlMode;
  browsers?: string[];
  userId?: string;
  enrich?: boolean;
}

const REQUEST_TIMEOUT_MS = 15_000;
const CONTACT_ENRICH_LIMIT = 5;

export async function crawlVendors(
  keyword: string,
  maxResults = 5,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  const configuredIds = (options.sources || []).map((source) => SOURCE_ALIASES[source] || source);

  if (options.mode === "headless") {
    const selected = configuredIds.length
      ? HEADLESS_SOURCES.filter((source) => configuredIds.includes(source.name))
      : [];
    const staticSelected = ALL_SOURCES.filter(
      (source) => !source.requiresHeadless && (configuredIds.length === 0 || configuredIds.includes(source.name))
    );
    const browsers = (options.browsers || []).length ? options.browsers : [DEFAULT_BROWSER_ID];
    const results: CrawlResult[] = [];
    // 静态 HTTP 源先跑（快），无头渲染的通用检索放后面
    if (staticSelected.length > 0) {
      results.push(
        await crawlB2BSources(
          staticSelected,
          keyword,
          Math.max(1, Math.min(options.pages || 1, 3)),
          options.delayMs || 1200,
          maxResults,
          options.enrich !== false
        )
      );
    }
    results.push(await crawlHeadless(keyword, maxResults, selected, browsers, options.userId, options.enrich));
    return results;
  }

  const selected = configuredIds.length
    ? ALL_SOURCES.filter((source) => configuredIds.includes(source.name))
    : ALL_SOURCES;
  return [await crawlB2BSources(
    selected,
    keyword,
    Math.max(1, Math.min(options.pages || 1, 3)),
    options.delayMs || 1200,
    maxResults,
    options.enrich !== false
  )];
}

// ---------------- 无头模式 ----------------

async function crawlHeadless(
  keyword: string,
  maxResults: number,
  platforms: CrawlerSource[] = [],
  browsers: string[] = [DEFAULT_BROWSER_ID],
  userId?: string,
  enrich: boolean = true
): Promise<CrawlResult> {
  try {
    if (platforms.length > 0) {
      return await crawlHeadlessPlatforms(keyword, maxResults, platforms, browsers, userId, enrich);
    }
    return await crawlGeneralSearch(keyword, maxResults, browsers, enrich);
  } catch (error: unknown) {
    return {
      vendors: [],
      sourceLabel: "无头采集",
      totalFound: 0,
      error: error instanceof Error ? error.message : "无头采集失败",
    };
  } finally {
    await closeAllHeadlessBrowsers();
  }
}

// 通用模式：DuckDuckGo 全网平等搜索（每个勾选浏览器各渲染一次）
async function crawlGeneralSearch(
  keyword: string,
  maxResults: number,
  browsers: string[],
  enrich: boolean = true
): Promise<CrawlResult> {
  const query = `${keyword} supplier manufacturer company`;
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

  const candidates: RenderedCandidate[] = [];
  const browserErrors: string[] = [];
  for (const browserId of browsers) {
    try {
      const html = await fetchRenderedHtml(searchUrl, browserId);
      const found = parseDuckDuckGoHtml(html).filter((candidate) => isUsableCompanyResult(candidate));
      for (const candidate of found) {
        if (!candidates.some((existing) => existing.url === candidate.url)) {
          candidates.push(candidate);
        }
      }
    } catch (error: unknown) {
      browserErrors.push(`${getBrowserLabel(browserId)}: ${error instanceof Error ? error.message : "渲染失败"}`);
    }
  }

  const vendors: ParsedVendor[] = candidates.map((candidate) => ({
    name: cleanCompanyName(candidate.title),
    email: extractBusinessEmail(candidate.snippet),
    phone: extractPhone(candidate.snippet),
    website: normalizeUrl(candidate.url),
    category: keyword,
    rating: 0,
    certificates: [],
    notes: `全网搜索来源: ${candidate.url}，需人工核验`,
    source: "DuckDuckGo 全网搜索",
    sourceUrl: candidate.url,
    products: [],
  }));

  const deduped = deduplicateVendors(vendors).slice(0, maxResults);
  const enriched = enrich
    ? await enrichWithOfficialContacts(deduped, browsers[0], (vendor) =>
        vendor.website ? vendor.website : undefined
      )
    : deduped;

  const browserLabel = browsers.map(getBrowserLabel).join("、");
  return {
    vendors: enriched,
    sourceLabel: `全网搜索 (${browserLabel})`,
    totalFound: enriched.length,
    error: browserErrors.length
      ? browserErrors.join("；")
      : enriched.length === 0
        ? "全网搜索没有找到可核验的企业页面"
        : undefined,
  };
}

function isUsableCompanyResult(candidate: RenderedCandidate): boolean {
  if (isNonOfficialDomain(candidate.url)) return false;
  if (isPlatformDomain(candidate.url)) return false;
  if (isDirectorySite(candidate.url)) return false;
  if (!isLikelyCompanyTitle(candidate.title)) return false;
  return true;
}

// 平台渲染模式：逐个平台渲染（每个平台轮流使用勾选浏览器）
async function crawlHeadlessPlatforms(
  keyword: string,
  maxResults: number,
  platforms: CrawlerSource[],
  browsers: string[],
  userId?: string,
  enrich: boolean = true
): Promise<CrawlResult> {
  const all: ParsedVendor[] = [];
  const platformErrors: string[] = [];

  for (let i = 0; i < platforms.length; i += 1) {
    const platform = platforms[i];
    const browserId = browsers[i % browsers.length];
    try {
      const url = platform.searchUrl(keyword, 1);
      const html = await fetchRenderedHtml(url, browserId);
      const parsed = platform.parse(html).map((vendor) => ({
        ...vendor,
        source: platform.label,
        sourceUrl: vendor.sourceUrl || url,
        category: vendor.category || keyword,
        notes: vendor.notes || `无头浏览器渲染 ${platform.label}: ${vendor.sourceUrl || url}，需人工核验`,
      }));
      all.push(...parsed);
    } catch (error: unknown) {
      if (error instanceof CaptchaRequiredError) {
        // 触发人工验证：保留已采集的其他平台结果，同时打开验证窗口供续采
        const url = platform.searchUrl(keyword, 1);
        await openManualVerification(url, browserId);
        pendingResume = { keyword, platform, maxResults, userId, enrich };
        const kept = deduplicateVendors(all).slice(0, maxResults);
        platformErrors.push(`${platform.label}: 触发人机验证，点击「继续采集」可在浏览器完成验证后续采`);
        return {
          vendors: kept,
          sourceLabel: `无头浏览器渲染 (${platforms.map((p) => p.label).join("、")})`,
          totalFound: kept.length,
          captcha: { url, browserId, platform: platform.label },
          error: platformErrors.join("；"),
        };
      }
      platformErrors.push(`${platform.label}: ${error instanceof Error ? error.message : "渲染失败"}`);
    }
    await sleep(800);
  }

  const deduped = deduplicateVendors(all).slice(0, maxResults);
  const enriched: ParsedVendor[] = [];
  for (const vendor of deduped) {
    if (enrich) {
      enriched.push(await enrichVendorOfficialSite(vendor, browsers[0]));
      await sleep(400);
    } else {
      enriched.push(vendor);
    }
  }

  const browserLabel = browsers.map(getBrowserLabel).join("、");
  return {
    vendors: enriched,
    sourceLabel: `无头浏览器渲染 (${platforms.map((p) => p.label).join("、")}; ${browserLabel})`,
    totalFound: enriched.length,
    error: platformErrors.length
      ? platformErrors.join("；")
      : enriched.length === 0
        ? "平台页面渲染成功，但没有解析到可核验的企业"
        : undefined,
  };
}

// ---------------- 单独官网补全（分阶段渲染第二阶段） ----------------

export async function enrichVendorsList(
  vendors: ParsedVendor[],
  browserId: string = DEFAULT_BROWSER_ID
): Promise<ParsedVendor[]> {
  const result: ParsedVendor[] = [];
  for (const vendor of vendors) {
    result.push(await enrichVendorOfficialSite(vendor, browserId));
    await sleep(400);
  }
  await closeAllHeadlessBrowsers();
  return result;
}

// HTTP 版官网定位（纯 HTTP，无需无头浏览器）——第二阶段分阶段渲染用
export async function enrichVendorsListHttp(
  vendors: ParsedVendor[]
): Promise<ParsedVendor[]> {
  const result: ParsedVendor[] = [];
  for (let i = 0; i < vendors.length; i += 3) {
    const batch = vendors.slice(i, i + 3);
    const enrichedBatch = await Promise.all(batch.map((vendor) => enrichVendorOfficialSiteHttp(vendor)));
    result.push(...enrichedBatch);
    await sleep(200);
  }
  return result;
}

// ---------------- 人工验证续采 ----------------

let pendingResume: { keyword: string; platform: CrawlerSource; maxResults: number; userId?: string; enrich?: boolean } | null = null;

export async function crawlVendorsResume(): Promise<CrawlResult> {
  if (!pendingResume) {
    return { vendors: [], sourceLabel: "人工验证续采", totalFound: 0, error: "没有进行中的手动验证会话" };
  }
  const { keyword, platform, maxResults, enrich } = pendingResume;
  pendingResume = null;
  try {
    const url = platform.searchUrl(keyword, 1);
    const html = await fetchCurrentFromManualBrowser();
    const parsed = platform.parse(html).map((vendor) => ({
      ...vendor,
      source: platform.label,
      sourceUrl: vendor.sourceUrl || url,
      category: vendor.category || keyword,
      notes: vendor.notes || `人工验证后自动采集 ${platform.label}，需人工核验`,
    }));
    const vendors = deduplicateVendors(parsed).slice(0, maxResults);
    const enriched: ParsedVendor[] = [];
    for (const vendor of vendors) {
      if (enrich === false) {
        enriched.push(vendor);
      } else {
        enriched.push(await enrichVendorOfficialSite(vendor, DEFAULT_BROWSER_ID));
      }
    }
    return {
      vendors: enriched,
      sourceLabel: `人工验证后自动采集 (${platform.label})`,
      totalFound: enriched.length,
      error: enriched.length === 0 ? "验证已通过，但页面没有解析到可核验的企业" : undefined,
    };
  } catch (error: unknown) {
    if (error instanceof CaptchaRequiredError) {
      return {
        vendors: [],
        sourceLabel: `人工验证后自动采集 (${platform.label})`,
        totalFound: 0,
        error: "验证码尚未完成，请完成验证后再次点击「继续采集」",
      };
    }
    return {
      vendors: [],
      sourceLabel: `人工验证后自动采集 (${platform.label})`,
      totalFound: 0,
      error: error instanceof Error ? error.message : "续采失败",
    };
  } finally {
    await closeManualVerification();
    await closeAllHeadlessBrowsers();
  }
}

// ---------------- 官网与联系方式补全 ----------------

async function enrichVendorOfficialSite(vendor: ParsedVendor, browserId: string): Promise<ParsedVendor> {
  try {
    const coreWords = extractCoreWords(vendor.name);

    const platformSite = await extractWebsiteFromPlatformPage(vendor, browserId);
    if (platformSite) {
      const enriched = await extractContactFromOfficialSite(vendor, platformSite, browserId);
      if (enriched) return enriched;
    }

    let candidates = await searchCandidates(`"${vendor.name}"`, browserId, coreWords);
    if (!candidates.some((candidate) => scoreCandidate(candidate.url, coreWords) > 0)) {
      const industryWord = (vendor.category || "").toLowerCase().split(/[\s,，、/]+/).find((word) => /[a-z]{3,}/.test(word));
      const reordered = [...coreWords.slice(1), coreWords[0], industryWord || ""].filter(Boolean).join(" ");
      const extra = await searchCandidates(reordered, browserId, coreWords);
      if (extra.length > 0) candidates = extra;
    }
    if (candidates.length === 0) return vendor;
    const site = candidates[0];

    const enriched = await extractContactFromOfficialSite(vendor, site.url, browserId, coreWords);
    return enriched || vendor;
  } catch {
    return vendor;
  }
}

async function enrichWithOfficialContacts(
  vendors: ParsedVendor[],
  browserId: string,
  getSiteUrl: (vendor: ParsedVendor) => string | undefined
): Promise<ParsedVendor[]> {
  const enriched: ParsedVendor[] = [];
  for (let i = 0; i < vendors.length; i += 1) {
    const vendor = vendors[i];
    const siteUrl = getSiteUrl(vendor);
    if (i < CONTACT_ENRICH_LIMIT && siteUrl && !isDirectorySite(siteUrl)) {
      const withContact = await extractContactFromOfficialSite(vendor, siteUrl, browserId);
      enriched.push(withContact || vendor);
      await sleep(400);
    } else {
      enriched.push(vendor);
    }
  }
  return enriched;
}

async function extractWebsiteFromPlatformPage(vendor: ParsedVendor, browserId: string): Promise<string | null> {
  const platformUrl = vendor.website || vendor.sourceUrl || "";
  if (!platformUrl || !isPlatformDomain(platformUrl)) return null;
  try {
    const html = await fetchRenderedHtml(platformUrl, browserId);
    const $ = cheerio.load(html);
    let found: string | null = null;
    $("a[href]").each((_, el) => {
      if (found) return;
      const href = $(el).attr("href") || "";
      if (!/^https?:\/\//i.test(href)) return;
      try {
        const hostname = new URL(href).hostname.toLowerCase();
        if (isPlatformDomain(`https://${hostname}`)) return;
        if (isNonOfficialDomain(`https://${hostname}`)) return;
        if (isDirectorySite(`https://${hostname}`)) return;
        found = href;
      } catch {
        // 跳过无效链接
      }
    });
    return found;
  } catch {
    return null;
  }
}

async function extractContactFromOfficialSite(
  vendor: ParsedVendor,
  siteUrl: string,
  browserId: string,
  coreWords?: string[]
): Promise<ParsedVendor | null> {
  try {
    const html = await fetchRenderedHtml(siteUrl, browserId);
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");
    const updated: ParsedVendor = { ...vendor };
    updated.email = extractBusinessEmail(text);
    updated.phone = extractPhone(text);
    const address = extractAddressText(text);
    if (!updated.address && address) updated.address = address;
    if (!updated.website) updated.website = normalizeUrl(siteUrl);
    updated.officialWebsite = normalizeUrl(siteUrl);
    updated.notes = `${updated.notes || ""}；官网: ${siteUrl}`;

    if (!updated.email || !updated.phone) {
      const contact = await extractContactFromSite(siteUrl, $, browserId);
      if (!updated.email && contact.email) updated.email = contact.email;
      if (!updated.phone && contact.phone) updated.phone = contact.phone;
      if (!updated.address && contact.address) updated.address = contact.address;
    }
    if (coreWords && coreWords.length > 0 && !isSameCompanySite(coreWords, siteUrl, $)) {
      return null;
    }
    return updated;
  } catch {
    return null;
  }
}

async function extractContactFromSite(
  siteUrl: string,
  $: cheerio.CheerioAPI,
  browserId: string
): Promise<{ email?: string; phone?: string; address?: string }> {
  const contactHref = $("a[href*='contact'], a[href*='Contact'], a[href*='CONTACT']").first().attr("href");
  if (contactHref && !/^(mailto:|tel:)/i.test(contactHref)) {
    try {
      const contactUrl = new URL(contactHref, siteUrl).toString();
      if (contactUrl !== siteUrl) {
        const html = await fetchRenderedHtml(contactUrl, browserId);
        const text = cheerio.load(html)("body").text().replace(/\s+/g, " ");
        return { email: extractBusinessEmail(text), phone: extractPhone(text), address: extractAddressText(text) };
      }
    } catch {
      // 继续尝试常见路径
    }
  }

  const base = siteUrl.replace(/\/+$/, "");
  for (const path of ["/Contact.html", "/contact.html", "/contact-us.html", "/contactus.html", "/contact", "/ContactUs.html"]) {
    try {
      const html = await fetchRenderedHtml(base + path, browserId);
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

function isSameCompanySite(coreWords: string[], siteUrl: string, $: cheerio.CheerioAPI): boolean {
  try {
    const hostname = new URL(siteUrl).hostname.toLowerCase();
    if (coreWords.some((word) => hostname.includes(word))) return true;
  } catch {
    // 域名解析失败时走标题校验
  }

  const title = $("title").text().replace(/\s+/g, " ");
  const haystack = [
    title,
    $("meta[property='og:site_name']").attr("content") || "",
    $("meta[name='description']").attr("content") || "",
  ].join(" ").toLowerCase();

  let matched = 0;
  for (const word of coreWords) {
    if (haystack.includes(word)) matched += 1;
  }
  return matched >= Math.min(2, coreWords.length);
}

async function searchCandidates(
  query: string,
  browserId: string,
  coreWords: string[]
): Promise<RenderedCandidate[]> {
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  const searchHtml = await fetchRenderedHtml(searchUrl, browserId);
  return parseDuckDuckGoHtml(searchHtml)
    .filter((candidate) => !isNonOfficialDomain(candidate.url))
    .filter((candidate) => !isPlatformDomain(candidate.url))
    .filter((candidate) => !isDirectorySite(candidate.url))
    .filter((candidate) => !domainHasOnlyCity(candidate.url, coreWords))
    .sort((a, b) => scoreCandidate(b.url, coreWords) - scoreCandidate(a.url, coreWords));
}

// ---------------- HTTP 直采 ----------------

async function crawlB2BSources(
  sources: CrawlerSource[],
  keyword: string,
  pages: number,
  delayMs: number,
  maxResults: number,
  enrich: boolean = true
): Promise<CrawlResult> {
  const all: ParsedVendor[] = [];
  const sourceErrors: string[] = [];
  const labels: string[] = [];

  for (const source of sources) {
    labels.push(source.label);
    if (source.requiresHeadless) {
      sourceErrors.push(`${source.label}: 该平台公开页面需要无头浏览器模式渲染，请在爬虫配置中切换模式`);
      continue;
    }
    const variants = source.variants ? source.variants(keyword) : [keyword];
    for (const variant of variants) {
      for (let page = 1; page <= pages; page += 1) {
        try {
          const url = source.searchUrl(variant, page);
          const html = await fetchHtml(url, source.headers);
          const parsed = source.parse(html).map((vendor) => ({
            ...vendor,
            source: source.label,
            sourceUrl: vendor.sourceUrl || url,
            category: vendor.category || keyword,
            notes: vendor.notes || `公开 B2B 平台直采: ${vendor.sourceUrl || url}`,
          }));
          all.push(...parsed);
        } catch (error: unknown) {
          sourceErrors.push(`${source.label}: ${error instanceof Error ? error.message : "请求失败"}`);
        }
        if (page < pages) await sleep(delayMs);
      }
      await sleep(delayMs);
    }
    await sleep(delayMs);
  }

  const deduped = deduplicateVendors(all);
  const enriched: ParsedVendor[] = [];
  for (const vendor of deduped) {
    if (enrich) {
      enriched.push(await enrichVendorContact(vendor));
      await sleep(delayMs);
    } else {
      enriched.push(vendor);
    }
  }

  const vendors = enriched.slice(0, maxResults);
  return {
    vendors,
    sourceLabel: labels.length ? `B2B 平台 (${labels.join("、")})` : "B2B 平台",
    totalFound: vendors.length,
    error: sourceErrors.length
      ? sourceErrors.join("；")
      : vendors.length === 0
        ? "平台公开页面请求成功，但没有解析到可核验的企业"
        : undefined,
  };
}

async function enrichVendorContact(vendor: ParsedVendor): Promise<ParsedVendor> {
  try {
    const contactUrl = buildContactUrl(vendor);
    if (!contactUrl) return vendor;
    const html = await fetchHtml(contactUrl);
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");
    const updated: ParsedVendor = { ...vendor };

    const address = extractAddressText(text);
    if (!updated.address && address) updated.address = address;

    const email = extractBusinessEmail(text);
    if (email) updated.email = email;

    const phone = extractPhone(text);
    if (phone) updated.phone = phone;

    if (!updated.email && !updated.phone) {
      updated.notes = `${vendor.notes || ""}；该平台公开页面不显示邮箱/电话，需登录平台站内联系`;
    }
    return updated;
  } catch {
    return vendor;
  }
}

function buildContactUrl(vendor: ParsedVendor): string | null {
  try {
    const hostname = new URL(vendor.website || "").hostname.toLowerCase();
    if (hostname.endsWith(".en.made-in-china.com")) return `https://${hostname}/contact-info.html`;
    if (hostname.endsWith(".en.alibaba.com")) return `https://${hostname}/company_profile.html`;
    return null;
  } catch {
    return null;
  }
}

function isEnrichableVendor(vendor: ParsedVendor): boolean {
  return Boolean(buildContactUrl(vendor));
}

// ---------------- HTTP 官网定位（纯 HTTP，无需无头浏览器） ----------------

async function searchCandidatesHttp(
  query: string,
  coreWords: string[]
): Promise<RenderedCandidate[]> {
  const candidates: RenderedCandidate[] = [];

  try {
    const html = await fetchHtml(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {}, 1);
    const $ = cheerio.load(html, { xmlMode: true });
    $("item").each((_, item) => {
      const title = $(item).find("title").text().replace(/\s+/g, " ").trim();
      const url = $(item).find("link").text().trim();
      if (title && /^https?:\/\//i.test(url)) candidates.push({ title, url, snippet: "" });
    });
  } catch {
    // 回退到 Bing HTML 解析
  }

  if (candidates.length === 0) {
    try {
      const html = await fetchHtml(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {}, 1);
      const $ = cheerio.load(html);
      $("li.b_algo h2 a").each((_, element) => {
        const title = $(element).text().replace(/\s+/g, " ").trim();
        let raw = $(element).attr("href") || "";
        if (/^https?:\/\//i.test(raw) && raw.includes("/ck/a")) {
          try {
            raw = new URL(raw).searchParams.get("u") || raw;
          } catch {
            // 保留原始链接
          }
        }
        if (title && /^https?:\/\//i.test(raw)) candidates.push({ title, url: raw, snippet: "" });
      });
    } catch {
      // 搜索端点均不可用
    }
  }

  return candidates
    .filter((candidate) => !isNonOfficialDomain(candidate.url))
    .filter((candidate) => !isPlatformDomain(candidate.url))
    .filter((candidate) => !isDirectorySite(candidate.url))
    .filter((candidate) => !domainHasOnlyCity(candidate.url, coreWords))
    .sort((a, b) => scoreCandidate(b.url, coreWords) - scoreCandidate(a.url, coreWords));
}

async function extractWebsiteFromPlatformPageHttp(vendor: ParsedVendor): Promise<string | null> {
  const platformUrl = vendor.website || vendor.sourceUrl || "";
  if (!platformUrl || !isPlatformDomain(platformUrl)) return null;
  try {
    const html = await fetchHtml(platformUrl);
    const $ = cheerio.load(html);
    let found: string | null = null;
    $("a[href]").each((_, el) => {
      if (found) return;
      const href = $(el).attr("href") || "";
      if (!/^https?:\/\//i.test(href)) return;
      try {
        const hostname = new URL(href).hostname.toLowerCase();
        if (isPlatformDomain(`https://${hostname}`)) return;
        if (isNonOfficialDomain(`https://${hostname}`)) return;
        if (isDirectorySite(`https://${hostname}`)) return;
        found = href;
      } catch {
        // 跳过无效链接
      }
    });
    return found;
  } catch {
    return null;
  }
}

async function extractWebsiteFromPlatformPageLight(vendor: ParsedVendor): Promise<string | null> {
  try {
    const site = await extractWebsiteFromPlatformPageHttp(vendor);
    return site ? normalizeUrl(site) || null : null;
  } catch {
    return null;
  }
}

async function extractContactFromOfficialSiteHttp(
  vendor: ParsedVendor,
  siteUrl: string,
  coreWords?: string[]
): Promise<ParsedVendor | null> {
  try {
    const html = await fetchHtml(siteUrl);
    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");
    const updated: ParsedVendor = { ...vendor };
    updated.email = extractBusinessEmail(text);
    updated.phone = extractPhone(text);
    const address = extractAddressText(text);
    if (!updated.address && address) updated.address = address;
    if (!updated.website) updated.website = normalizeUrl(siteUrl);
    updated.officialWebsite = normalizeUrl(siteUrl);
    updated.notes = `${updated.notes || ""}；官网定位: ${siteUrl}`;

    if (!updated.email || !updated.phone) {
      const contact = await extractContactFromSiteHttp(siteUrl, $);
      if (!updated.email && contact.email) updated.email = contact.email;
      if (!updated.phone && contact.phone) updated.phone = contact.phone;
      if (!updated.address && contact.address) updated.address = contact.address;
    }
    if (coreWords && coreWords.length > 0 && !isSameCompanySite(coreWords, siteUrl, $)) {
      return null;
    }
    return updated;
  } catch {
    return null;
  }
}

async function extractContactFromSiteHttp(
  siteUrl: string,
  $: cheerio.CheerioAPI
): Promise<{ email?: string; phone?: string; address?: string }> {
  const contactHref = $("a[href*='contact'], a[href*='Contact'], a[href*='CONTACT']").first().attr("href");
  if (contactHref && !/^(mailto:|tel:)/i.test(contactHref)) {
    try {
      const contactUrl = new URL(contactHref, siteUrl).toString();
      if (contactUrl !== siteUrl) {
        const html = await fetchHtml(contactUrl);
        const text = cheerio.load(html)("body").text().replace(/\s+/g, " ");
        return { email: extractBusinessEmail(text), phone: extractPhone(text), address: extractAddressText(text) };
      }
    } catch {
      // 继续尝试常见路径
    }
  }

  const base = siteUrl.replace(/\/+$/, "");
  for (const path of ["/Contact.html", "/contact.html", "/contact-us.html", "/contactus.html", "/contact", "/ContactUs.html"]) {
    try {
      const html = await fetchHtml(base + path);
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

async function enrichVendorOfficialSiteHttp(vendor: ParsedVendor): Promise<ParsedVendor> {
  try {
    // 平台页已直接给出官网时优先使用，不再全网搜索（避免把官网错配成其他平台店铺页）
    const knownSite = vendor.officialWebsite || vendor.website || "";
    if (knownSite && /^https?:\/\//i.test(knownSite) && !isPlatformDomain(knownSite)) {
      const rawCoreWords = extractCoreWords(vendor.name);
      const coreWords = cleanCoreWords(rawCoreWords).length ? cleanCoreWords(rawCoreWords) : rawCoreWords;
      const enriched = await extractContactFromOfficialSiteHttp(vendor, knownSite, coreWords);
      if (enriched) return enriched;
      return { ...vendor, website: vendor.website || normalizeUrl(knownSite) || undefined };
    }

    const rawCoreWords = extractCoreWords(vendor.name);
    const coreWords = cleanCoreWords(rawCoreWords).length ? cleanCoreWords(rawCoreWords) : rawCoreWords;

    const platformSite = await extractWebsiteFromPlatformPageLight(vendor);
    if (platformSite) {
      const enriched = await extractContactFromOfficialSiteHttp(vendor, platformSite, coreWords);
      if (enriched) return enriched;
    }

    let candidates: RenderedCandidate[] = [];
    try {
      candidates = await searchCandidatesHttp(`"${vendor.name}"`, coreWords);
    } catch {
      candidates = [];
    }
    if (!candidates.some((candidate) => scoreCandidate(candidate.url, coreWords) > 0)) {
      const industryWord = (vendor.category || "").toLowerCase().split(/[\s,，、/]+/).find((word) => /[a-z]{3,}/.test(word));
      const reordered = [...coreWords.slice(1), coreWords[0], industryWord || ""].filter(Boolean).join(" ");
      try {
        const extra = await searchCandidatesHttp(reordered, coreWords);
        if (extra.length > 0) candidates = extra;
      } catch {
        // 保持原候选
      }
    }
    if (candidates.length === 0) return vendor;

    for (const site of candidates.slice(0, 3)) {
      const enriched = await extractContactFromOfficialSiteHttp(vendor, site.url, coreWords);
      if (enriched) return enriched;
    }
    return vendor;
  } catch {
    return vendor;
  }
}

// 品牌词过滤：去除城市/行业/公司后缀等通用词，避免城市门户域名被误判为官网
const GENERIC_CORE_WORDS = new Set([
  "shenzhen", "beijing", "shanghai", "guangzhou", "hangzhou", "ningbo", "wuxi", "suzhou",
  "chengdu", "wuhan", "nanjing", "dongguan", "foshan", "zhongshan", "qingdao", "dalian",
  "xiamen", "hefei", "changsha", "zhengzhou", "fuzhou", "chongqing", "tianjin", "shenyang",
  "jinan", "kunshan", "changzhou", "jiangsu", "zhejiang", "guangdong", "hunan", "anhui",
  "manufactur", "manufacturer", "manufacturing", "sensor", "sensors", "sensing", "industry", "industries",
  "industrial", "technolog", "technology", "technologies", "electronic", "electronics", "equipment", "auto",
  "automatic", "automation", "trade", "export", "import", "group", "holding", "limited", "company", "co",
  "ltd", "inc", "corp", "corporation", "llc", "gmbh", "comm", "intl", "international", "sci",
  "science", "scientific", "instrument", "instruments", "control", "controls", "system", "systems",
  "electric", "electrical", "mechanical", "machine", "machinery", "component", "components",
  "parts", "product", "products", "works", "factory", "meter", "meters", "solution", "solutions",
]);

function cleanCoreWords(words: string[]): string[] {
  return words.filter((word) => !GENERIC_CORE_WORDS.has(word));
}

// ---------------- 基础 HTTP 请求 ----------------

let cachedProxyAgent: { dispatcher: unknown; proxyUrl: string } | null | undefined;

function getProxyDispatcher(): { dispatcher: unknown; proxyUrl: string } | null {
  if (cachedProxyAgent !== undefined) return cachedProxyAgent;
  const proxyUrl = (process.env.CRAWLER_PROXY || "").trim();
  if (!proxyUrl) {
    cachedProxyAgent = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ProxyAgent } = require("undici") as { ProxyAgent: new (url: string) => unknown };
    cachedProxyAgent = { dispatcher: new ProxyAgent(proxyUrl), proxyUrl };
  } catch {
    cachedProxyAgent = null;
  }
  return cachedProxyAgent;
}

// 国内可达域名直连（避免经代理绕行变慢），其余走代理
function shouldUseProxy(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith(".cn") || hostname.endsWith(".com.cn")) return false;
    const domestic = [
      "made-in-china.com", "alibaba.com", "1688.com", "hc360.com", "baidu.com",
      "sogou.com", "so.com", "cn.bing.com", "qq.com", "taobao.com", "jd.com",
      "b2b.hc360.com", "weixin.qq.com", "zhihu.com", "csdn.net",
    ];
    return !domestic.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export async function fetchHtml(
  url: string,
  headers: Record<string, string> = {},
  retries = 3
): Promise<string> {
  const UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ];
  let lastError = "请求失败";
  const proxy = getProxyDispatcher();
  const useProxy = proxy && shouldUseProxy(url);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // 国际域名优先走代理（海外国际索引），国内域名直连；代理失败回退直连
      let response: Response | null = null;
      if (useProxy) {
        try {
          const init: Record<string, unknown> = {
            signal: controller.signal,
            headers: { "User-Agent": UA_POOL[attempt % UA_POOL.length], ...headers },
            redirect: "follow",
            dispatcher: proxy.dispatcher,
          };
          response = await fetch(url, init as RequestInit);
        } catch {
          response = null;
        }
      }
      if (!response) {
        response = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": UA_POOL[attempt % UA_POOL.length], ...headers },
          redirect: "follow",
        });
      }
      if (!response.ok) throw new Error(`网页请求失败 (${response.status})`);
      const text = await response.text();
      if (
        text.length < 20_000 &&
        /请验证|unusual traffic|captcha|人机验证|安全验证/i.test(text.slice(0, 5000))
      ) {
        throw new Error("平台返回人机验证页（请验证）");
      }
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "请求失败";
      if (attempt < retries) await sleep(1600 + attempt * 500 + Math.floor(Math.random() * 2000));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`请求失败（已重试 ${retries} 次）：${lastError}`);
}
