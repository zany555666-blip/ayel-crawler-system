// 爬虫共享工具：域名过滤、文本提取、去重

export function extractBusinessEmail(text: string): string | undefined {
  return (text.match(/[A-Z0-9._%+-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)*\.[A-Z]{2,6}(?![A-Za-z0-9])/gi) || [])
    .map((email) => email.replace(/(copyright|allrightsreserved).*$/i, "").replace(/[.,;:]+$/, ""))
    .find((email) => email.includes(".") && !/example\.(com|org)|test\.|\.png|\.jpg|\.jpeg|\.gif|\.webp/i.test(email));
}

export function extractPhone(text: string): string | undefined {
  const mobile = text.match(/(?<!\d)(?:\+?86[- ]?)?1[3-9]\d{9}(?!\d)/);
  if (mobile) return mobile[0];
  const intl = text.match(/(?<!\d)\+\d{2,3}[- ]?\d{6,12}(?!\d)/);
  if (intl) return intl[0];
  const landline = text.match(/(?<!\d)0\d{2,3}[- ]?\d{7,8}(?!\d)/);
  return landline?.[0];
}

export function extractAddressText(text: string): string | undefined {
  const cleaned = text
    .replace(/Select a country[^|]{0,300}/gi, "")
    .replace(/City Zip Code Country[^|]{0,200}/gi, "");
  const match = cleaned.match(/(?:Address|地址)[\s:：]+([^|]{5,150})/i);
  if (!match) return undefined;
  const value = match[1]
    .split(/\s+(?:Main Markets|Number of|Plant Area|OEM|Supply Chain|Minimum Order|Zip|Postal|Contact Person|Tel|Phone|Fax)/i)[0]
    .trim();
  if (value.length < 5 || value.length > 120) return undefined;
  if (/\d{4}-\d{2}-\d{2}/.test(value)) return undefined;
  if (value.split(",").length > 4) return undefined;
  return value;
}

export function normalizeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

export function cleanCompanyName(value: string): string {
  return value.replace(/\s*[|｜·-].*$/, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function deduplicateVendors<T extends { name: string; website?: string }>(vendors: T[]): T[] {
  const seen = new Set<string>();
  return vendors.filter((vendor) => {
    const key = normalizeUrl(vendor.website || "") || vendor.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const BLOCKED_DOMAINS = [
  "163.com", "sina.com.cn", "sohu.com", "qq.com", "ifeng.com", "thepaper.cn", "toutiao.com",
  "baike.baidu.com", "baike.com", "wikipedia.org", "zhihu.com", "weibo.com",
  "dictionary.cambridge.org", "iciba.com", "youtube.com", "bilibili.com",
  "merriam-webster.com", "dictionary.com", "geeksforgeeks.org", "electronicshub.org",
  "hackatronic.com", "electricaltechnology.org", "realpars.com", "mdpi.com", "cgaa.org",
];

const DIRECTORY_SITES = [
  "thomasnet.com", "ensun.io", "indiamart.com", "exportersindia.com", "tradeindia.com",
  "ec21.com", "tradekey.com", "machinerytrader.com", "plantautomation-technology.com",
  "made-in-china.com", "alibaba.com", "globalsources.com", "hc360.com", "1688.com",
  "volza.com", "trademo.com", "europages.co.uk", "europages.com", "wlw.com", "wlw.de",
  "globalspec.com", "importgenius.com", "panjiva.com", "52wmb.com", "tendata.com",
  "tradewheel.com", "kompass.com", "wanted.de", "exportyeti.com",
];

const PLATFORM_DOMAINS = ["made-in-china.com", "alibaba.com", "globalsources.com", "hc360.com", "1688.com"];

export function isNonOfficialDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (
      hostname.endsWith(".gov.cn") || hostname.endsWith(".gov") ||
      hostname.endsWith(".edu.cn") || hostname.endsWith(".edu") ||
      hostname.endsWith(".org.cn")
    ) {
      return true;
    }
    return BLOCKED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

export function isDirectorySite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return DIRECTORY_SITES.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

export function isPlatformDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PLATFORM_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true;
  }
}

export function isLikelyCompanyTitle(title: string): boolean {
  if (/top \d+|best |ranking|list of|guide|article|tutorial|how to|manufacturers and suppliers in/i.test(title)) {
    return false;
  }
  if (/\d+\s*products?/i.test(title)) return false;
  if (/famous|world \w+ (?:sensor|manufactur|compan)/i.test(title)) return false;
  if (/\d+\s+\w+\s+(?:sensor|manufactur)\w*\s+compan/i.test(title)) return false;
  return /(co\.?,?\s*ltd|ltd\.?|inc\.?|corp\.?|gmbh|llc|company|manufacturer|supplier|factory|sensor|instrument|technology|tech|electronics?|有限公司|股份有限公司|科技|电子|机械|制造|设备|材料|化工|五金)/i.test(title);
}

export function extractCoreWords(name: string): string[] {
  const suffixes = /\b(co\.?|ltd\.?|inc\.?|corp\.?|corporation|group|company|gmbh|llc|limited)\b/gi;
  const core = name.toLowerCase().replace(suffixes, " ");
  return (core.match(/[a-z0-9]{3,}/g) || [])
    .filter((word) => !/^(www|com|cn|net)$/.test(word));
}

export function scoreCandidate(url: string, coreWords: string[]): number {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    let score = 0;
    for (const word of coreWords) {
      if (hostname.includes(word)) score += 2;
    }
    return score;
  } catch {
    return -1;
  }
}

export function domainHasOnlyCity(url: string, coreWords: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return !coreWords.some((word) => hostname.includes(word));
  } catch {
    return true;
  }
}
