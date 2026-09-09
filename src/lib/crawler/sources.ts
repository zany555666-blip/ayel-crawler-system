import * as cheerio from "cheerio";

// 公开 B2B 平台直采源。
// HTTP 模式直接请求平台公开搜索页并解析真实企业名称与主页；
// 需要 JS 渲染或存在访问控制的平台标记 requiresHeadless。

export class CaptchaRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptchaRequiredError";
  }
}

export interface CrawlerSource {
  name: string;
  label: string;
  searchUrl: (keyword: string, page: number) => string;
  headers?: Record<string, string>;
  requiresHeadless?: boolean;
  variants?: (keyword: string) => string[];
  parse: (html: string) => ParsedVendor[];
}

export interface ParsedVendor {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  website?: string;
  officialWebsite?: string;
  category?: string;
  rating?: number;
  certificates?: string[];
  notes?: string;
  source: string;
  sourceUrl?: string;
  products?: { name: string; price: string }[];
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Made-in-China.com 供应商列表直采
export const madeInChina: CrawlerSource = {
  name: "made-in-china",
  label: "Made-in-China.com",
  searchUrl: (keyword) => {
    if (/[\u4e00-\u9fa5]/.test(keyword)) {
      return `https://www.made-in-china.com/multi-search/${encodeURI(keyword)}/F1/1.html`;
    }
    return `https://www.made-in-china.com/manufacturers/${encodeURI(keywordSlug(keyword))}.html`;
  },
  headers: {
    "User-Agent": BROWSER_UA,
    "Accept-Language": "en-US,en;q=0.9",
  },
  parse: (html) => parseMicManufacturers(html),
};

// 阿里巴巴国际站公开搜索页直采
export const alibaba1688: CrawlerSource = {
  name: "1688",
  label: "Alibaba.com 国际站",
  searchUrl: (keyword) =>
    `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}`,
  headers: {
    "User-Agent": BROWSER_UA,
    "Accept-Language": "en-US,en;q=0.9",
  },
  parse: (html) => parseAlibabaSearch(html),
};

// Global Sources：公开页面存在访问控制，需无头浏览器渲染
export const globalSources: CrawlerSource = {
  name: "global-sources",
  label: "Global Sources",
  requiresHeadless: true,
  searchUrl: (keyword) =>
    `https://www.globalsources.com/searchList/products?keyWord=${encodeURIComponent(keyword)}&pageNum=1`,
  headers: { "Accept-Language": "en-US,en;q=0.9" },
  parse: (html) => parseGlobalSources(html),
};

// 慧聪网：公开页面依赖 JS 渲染，需无头浏览器渲染
export const hc360: CrawlerSource = {
  name: "hc360",
  label: "慧聪网",
  requiresHeadless: true,
  searchUrl: (keyword) => `https://s.hc360.com/?w=${encodeURIComponent(keyword)}`,
  headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
  parse: (html) => parseHc360(html),
};

// ExportersIndia 供应商搜索（静态 HTML，HTTP 直取）
// 平台不做连写词模糊匹配（hangtag 仅 2 条、hang tag 46 条），按常见产品后缀拆词补充查询
const EXPORTERS_PRODUCT_SUFFIXES = [
  "stickers", "sticker", "holders", "holder", "printers", "printer", "stands", "stand",
  "labels", "label", "boxes", "box", "bags", "bag", "rolls", "roll", "tapes", "tape",
  "sheets", "sheet", "tags", "tag", "cards", "card", "papers", "paper", "films", "film", "racks", "rack",
];

function exportersKeywordVariants(keyword: string): string[] {
  const variants: string[] = [keyword];
  const lower = keyword.toLowerCase().trim();
  if (/^[a-z]+$/.test(lower) && lower.length > 4) {
    for (const suffix of EXPORTERS_PRODUCT_SUFFIXES) {
      if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
        variants.push(`${lower.slice(0, -suffix.length)} ${suffix}`.trim());
        break;
      }
    }
  }
  return variants.slice(0, 2);
}

export const exportersIndiaSuppliers: CrawlerSource = {
  name: "exportersindia",
  label: "ExportersIndia 供应商",
  searchUrl: (keyword) =>
    `https://www.exportersindia.com/search.php?term=${encodeURIComponent(keyword)}&srch_catg_ty=suppliers`,
  headers: {
    "User-Agent": BROWSER_UA,
    "Accept-Language": "en-US,en;q=0.9",
  },
  variants: exportersKeywordVariants,
  parse: (html) => parseExportersIndiaSuppliers(html),
};

export const ALL_SOURCES: CrawlerSource[] = [madeInChina, alibaba1688, globalSources, hc360, exportersIndiaSuppliers];

// 无头浏览器模式下可勾选的平台（需要 JS 渲染的公开搜索页）
export const HEADLESS_SOURCES: CrawlerSource[] = [alibaba1688, globalSources, hc360];

export const SOURCE_ALIASES: Record<string, string> = {
  "阿里巴巴1688": "1688",
  "Alibaba.com": "1688",
  "1688": "1688",
  "慧聪网": "hc360",
  hc360: "hc360",
  "中国制造网": "made-in-china",
  "Made-in-China.com": "made-in-china",
  "made-in-china": "made-in-china",
  "GlobalSources": "global-sources",
  "Global Sources": "global-sources",
  "global-sources": "global-sources",
  "ExportersIndia": "exportersindia",
  "exportersindia": "exportersindia",
};

function keywordSlug(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseMicManufacturers(html: string): ParsedVendor[] {
  const $ = cheerio.load(html);
  const vendors: ParsedVendor[] = [];
  const seen = new Set<string>();

  $("a[href*='.en.made-in-china.com']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const host = extractMicHost(href);
    if (!host || !text) return;
    if (text.length < 4 || text.length > 160) return;
    if (/(^|:\s)\$/i.test(text) || /MOQ|Piece|Request Free|audited|Virtual Tour|Audit Report|\d+\s*Products?$/i.test(text)) return;
    if (href.includes("/product/") || href.includes("/audited-") || href.includes("/Product-Catalogs") || href.includes("/360-")) return;
    if (seen.has(host)) return;
    seen.add(host);

    vendors.push({
      name: text,
      website: `https://${host}`,
      country: "中国",
      rating: 0,
      certificates: [],
      source: "Made-in-China.com",
      sourceUrl: `https://${host}`,
      products: [],
    });
  });

  return vendors.slice(0, 20);
}

function extractMicHost(href: string): string | null {
  const match = href.match(/([a-z0-9-]+\.en\.made-in-china\.com)/i);
  return match ? match[1] : null;
}

function parseAlibabaSearch(html: string): ParsedVendor[] {
  const $ = cheerio.load(html);
  if (/验证码|拦截|punish|captcha|unusual traffic/i.test($("title").text())) {
    throw new CaptchaRequiredError("阿里巴巴触发了验证码风控，请完成人工验证后继续");
  }
  const vendors: ParsedVendor[] = [];
  const seen = new Set<string>();

  $("a[href*='company_profile.html']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const host = extractAlibabaHost(href);
    if (!host || seen.has(host)) return;

    const text = ($(el).attr("title") || $(el).text() || "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length < 4 || text.length > 160) return;
    if (/^\d|yrs?$/i.test(text)) return;
    if (!/[a-zA-Z]/.test(text)) return;

    seen.add(host);
    vendors.push({
      name: text,
      website: `https://${host}`,
      country: "中国",
      rating: 0,
      certificates: [],
      source: "Alibaba.com 国际站",
      sourceUrl: `https://${host}`,
      products: [],
    });
  });

  return vendors.slice(0, 20);
}

function extractAlibabaHost(href: string): string | null {
  const match = href.match(/([a-z0-9-]+\.en\.alibaba\.com)/i);
  return match ? match[1] : null;
}

function parseGlobalSources(html: string): ParsedVendor[] {
  const $ = cheerio.load(html);
  if (/Pardon Our Interruption|captcha|verify|人机验证|Request unsuccessful|Incapsula|Imperva/i.test(html.slice(0, 8000))) {
    throw new CaptchaRequiredError("Global Sources 返回人机验证页，请完成人工验证后继续");
  }
  const vendors: ParsedVendor[] = [];
  const seen = new Set<string>();

  $("li.card-box, li.item").each((_, el) => {
    const supplierName = $(el).find(".o2o-name .link-el, .o2o-name, .name").first().text().replace(/\s+/g, " ").trim();
    if (!supplierName || supplierName.length < 4 || supplierName.length > 160) return;
    if (!/[a-zA-Z]/.test(supplierName)) return;
    if (/^(Add to Compare|Contact Supplier|Ad)$/i.test(supplierName)) return;
    const key = supplierName.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const productName = $(el).find(".product-name").first().text().replace(/\s+/g, " ").trim();
    const price = $(el).find(".price").first().text().replace(/\s+/g, " ").trim();
    const link = $(el).find("a[href*='.htm']").first().attr("href") || "";

    vendors.push({
      name: supplierName,
      website: link.startsWith("//") ? `https:${link}` : link || undefined,
      country: undefined,
      rating: 0,
      certificates: [],
      source: "Global Sources",
      sourceUrl: link.startsWith("//") ? `https:${link}` : link || undefined,
      products: productName ? [{ name: productName, price: price || "" }] : [],
    });
  });

  return vendors.slice(0, 20);
}

function parseHc360(html: string): ParsedVendor[] {
  const $ = cheerio.load(html);
  if (/验证码|拦截|安全验证|captcha|verify/i.test($("title").text()) || /人机验证|安全验证/.test(html.slice(0, 5000))) {
    throw new CaptchaRequiredError("慧聪网触发了安全验证，请完成人工验证后继续");
  }
  const vendors: ParsedVendor[] = [];
  const seen = new Set<string>();

  $("a[href*='.hc360.com'], a[href*='b2b.hc360.com']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 4 || text.length > 160) return;
    if (!/(公司|厂|有限公司|科技|机械|电子|制造|设备|材料|化工|五金)/.test(text)) return;
    const url = href.startsWith("//") ? `https:${href}` : href;
    if (!/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    vendors.push({
      name: text,
      website: url,
      country: "中国",
      rating: 0,
      certificates: [],
      source: "慧聪网",
      sourceUrl: url,
      products: [],
    });
  });

  return vendors.slice(0, 20);
}

// ExportersIndia 供应商搜索结果解析（class_box_sec 列表项）
function parseExportersIndiaSuppliers(html: string): ParsedVendor[] {
  const $ = cheerio.load(html);
  if (/page not found|page removed|410/i.test($("title").text())) return [];
  const vendors: ParsedVendor[] = [];
  const seen = new Set<string>();

  $('[class*="class_box_sec_"]').each((_, el) => {
    const companyName = $("h3._company a", el).first().text().replace(/\s+/g, " ").trim();
    if (!companyName || companyName.length < 3 || seen.has(companyName.toLowerCase())) return;
    seen.add(companyName.toLowerCase());

    const officialWebsite = $("h3._company a", el).first().attr("href") || "";
    const productName = $("h2 a.prdclk", el).first().text().replace(/\s+/g, " ").trim();
    const price = $("._price", el).first().text().replace(/\s+/g, " ").trim();
    const fullAddress = $("._fAdre span.title_tooltip", el).attr("data-tooltip") || $("._fAdre", el).text().replace(/\s+/g, " ").trim();
    const attrs: string[] = [];
    $("._attriButes li", el).each((_, li) => {
      const lbl = $(".eipdt-lbl", li).text().trim();
      const val = $(".eipdt-val", li).text().trim();
      if (lbl && val) attrs.push(`${lbl}${val}`);
    });

    vendors.push({
      name: companyName,
      country: fullAddress && /India/i.test(fullAddress) ? "India" : undefined,
      address: fullAddress || undefined,
      website: officialWebsite.startsWith("http") ? officialWebsite : undefined,
      officialWebsite: officialWebsite.startsWith("http") ? officialWebsite : undefined,
      rating: 0,
      certificates: [],
      source: "ExportersIndia 供应商",
      sourceUrl: officialWebsite.startsWith("http") ? officialWebsite : undefined,
      products: productName ? [{ name: productName, price: price || "" }] : [],
      notes: attrs.length ? attrs.join("；") : undefined,
    });
  });

  return vendors.slice(0, 20);
}
