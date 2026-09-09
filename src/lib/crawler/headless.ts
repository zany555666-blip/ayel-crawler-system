import { existsSync } from "fs";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";
import * as cheerio from "cheerio";

// 无头浏览器模式：使用本机主流浏览器渲染公开页面，再解析渲染后的 HTML。
// 只读取公开页面，不处理验证码、登录或访问控制。

export interface BrowserDef {
  id: string;
  label: string;
  paths: string[];
  kind: "chromium" | "firefox";
}

export const BROWSER_DEFS: BrowserDef[] = [
  {
    id: "chrome",
    label: "Google Chrome",
    kind: "chromium",
    paths: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
  },
  {
    id: "edge",
    label: "Microsoft Edge",
    kind: "chromium",
    paths: [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
  },
  {
    id: "firefox",
    label: "Mozilla Firefox",
    kind: "firefox",
    paths: [
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
      "C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe",
    ],
  },
];

export const DEFAULT_BROWSER_ID = "edge";

export const USER_AGENT =  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const browserCache = new Map<string, Promise<Browser>>();

export interface RenderedCandidate {
  title: string;
  url: string;
  snippet: string;
}

export function parseDuckDuckGoHtml(html: string): RenderedCandidate[] {
  const $ = cheerio.load(html);
  const candidates: RenderedCandidate[] = [];
  $("a[data-testid='result-title-a']").each((_, element) => {
    const title = $(element).text().replace(/\s+/g, " ").trim();
    const url = $(element).attr("href") || "";
    if (title && /^https?:\/\//i.test(url)) {
      candidates.push({ title, url, snippet: "" });
    }
  });
  return candidates.slice(0, 20);
}

export async function fetchRenderedHtml(
  url: string,
  browserId: string = DEFAULT_BROWSER_ID,
  cookies: CookieData[] = [],
  useProxy = false
): Promise<string> {
  const browser = await getBrowser(browserId, useProxy);
  const page = await browser.newPage();
  try {
    if (cookies.length > 0) {
      await page.setCookie(...cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || "/",
      })));
    }
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.floor(Math.random() * 700)));
    await page.evaluate(() => window.scrollTo({ top: Math.min(window.innerHeight, 700), behavior: "smooth" }));
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 500)));
    return await page.content();
  } finally {
    await page.close().catch(() => undefined);
  }
}

// 带 Cloudflare 验证等待的渲染：检测到验证页（Just a moment/请稍候）时
// 循环等待自动验证完成（通常 5-15 秒），最多等待 maxWaitMs。
export async function fetchRenderedHtmlWithVerify(
  url: string,
  browserId: string = DEFAULT_BROWSER_ID,
  useProxy = false,
  maxWaitMs = 30_000,
  navTimeoutMs = 25_000
): Promise<string> {
  const browser = await getBrowser(browserId, useProxy);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeoutMs });
    } catch {
      // 导航超时（Cloudflare 验证或慢网络）：内容可能已部分加载，继续检查
    }

    const verifyPattern = /(just a moment|请稍候|one moment|checking your browser|verify you are human|attention required|enable javascript)/i;
    const start = Date.now();
    let content = await page.content();
    while (Date.now() - start < maxWaitMs && verifyPattern.test(content.slice(0, 20_000))) {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      try {
        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 8000 });
      } catch {
        // 未发生导航则直接检查当前内容
      }
      content = await page.content();
    }

    await page.evaluate(() => window.scrollTo({ top: Math.min(window.innerHeight, 700), behavior: "smooth" }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    return await page.content();
  } finally {
    await page.close().catch(() => undefined);
  }
}

export function getAvailableBrowserIds(): string[] {
  return BROWSER_DEFS.filter((def) => findBrowserPath(def.id)).map((def) => def.id);
}

export function getBrowserLabel(id: string): string {
  return BROWSER_DEFS.find((def) => def.id === id)?.label || id;
}

export function parseBingHtml(html: string): RenderedCandidate[] {  const $ = cheerio.load(html);
  const candidates: RenderedCandidate[] = [];

  $("li.b_algo").each((_, element) => {
    const link = $(element).find("h2 a").first();
    const title = link.text().replace(/\s+/g, " ").trim();
    const cite = $(element).find("cite").first().text().replace(/\s+/g, "").trim();
    const citeUrl = cite && /^https?:\/\//i.test(cite) ? cite.split("›")[0].trim() : "";
    const url = citeUrl || link.attr("href") || "";
    const snippet = $(element).find(".b_caption p, p").first().text().replace(/\s+/g, " ").trim();
    if (title && /^https?:\/\//i.test(url) && !url.includes("bing.com")) {
      candidates.push({ title, url, snippet });
    }
  });

  if (candidates.length === 0) {
    $("h2 a[href]").each((_, element) => {
      const title = $(element).text().replace(/\s+/g, " ").trim();
      const url = $(element).attr("href") || "";
      const snippet = $(element).closest("li").text().replace(/\s+/g, " ").trim();
      if (title && /^https?:\/\//i.test(url) && !url.includes("bing.com")) {
        candidates.push({ title, url, snippet });
      }
    });
  }

  return candidates.slice(0, 30);
}

export async function closeAllHeadlessBrowsers(): Promise<void> {
  const entries = Array.from(browserCache.entries());
  browserCache.clear();
  await Promise.all(entries.map(([, browser]) => browser.then((b) => b.close()).catch(() => undefined)));
}

export async function closeHeadlessBrowser(): Promise<void> {
  await closeAllHeadlessBrowsers();
}

export function isHeadlessModeAvailable(): string | null {
  return findBrowserPath(DEFAULT_BROWSER_ID);
}

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path?: string;
}

let manualBrowser: Browser | null = null;
let manualBrowserId: string | null = null;

export async function openManualVerification(url: string, browserId: string): Promise<void> {
  if (manualBrowser) await manualBrowser.close().catch(() => undefined);
  const def = BROWSER_DEFS.find((candidate) => candidate.id === browserId);
  const executablePath = def && findBrowserPath(browserId);
  if (!executablePath) {
    throw new Error(`未找到本机 ${def?.label || browserId} 浏览器`);
  }
  manualBrowser = await puppeteer.launch({
    executablePath,
    headless: false,
    browser: def?.kind === "firefox" ? "firefox" : "chrome",
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
    ],
  });
  manualBrowserId = browserId;
  const page = await manualBrowser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.setViewport({ width: 1280, height: 850 });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  try {
    const content = await page.content();
    if (/Request unsuccessful|Incapsula|incident/i.test(content.slice(0, 10000))) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch {
    // 刷新失败不阻塞人工验证流程
  }
}

export async function collectManualSession(): Promise<CookieData[]> {
  if (!manualBrowser) return [];
  const pages = await manualBrowser.pages();
  const page = pages.find((p) => !p.isClosed()) || pages[0];
  const cookies = await page.cookies();
  return cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
  }));
}

export async function fetchFromManualBrowser(url: string): Promise<string> {
  if (!manualBrowser) throw new Error("没有进行中的手动验证会话");
  const page = (await manualBrowser.pages()).find((p) => !p.isClosed()) || (await manualBrowser.newPage());
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
  try {
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 20_000 });
  } catch {
    // 网络未完全空闲时继续，用固定等待兜底
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.evaluate(() => window.scrollTo({ top: Math.min(window.innerHeight, 700), behavior: "smooth" }));
  await new Promise((resolve) => setTimeout(resolve, 800));
  return await page.content();
}

export async function fetchCurrentFromManualBrowser(): Promise<string> {
  if (!manualBrowser) throw new Error("没有进行中的手动验证会话");
  await new Promise((resolve) => setTimeout(resolve, 4000));
  try {
    await (await manualBrowser.pages())[0]?.waitForNetworkIdle({ idleTime: 1200, timeout: 10_000 });
  } catch {
    // 继续
  }
  const pages = (await manualBrowser.pages()).filter((p) => !p.isClosed());
  const ordered = [
    ...pages.filter((p) => p.url().includes("globalsources")),
    ...pages.filter((p) => !p.url().includes("globalsources") && !p.url().startsWith("about:")),
    ...pages.filter((p) => p.url().startsWith("about:")),
  ];
  let best = "";
  for (const page of ordered) {
    try {
      const content = await page.content();
      if (content.length > best.length) best = content;
    } catch {
      // 跳过失效页面
    }
  }
  if (!best) {
    const fallback = await manualBrowser.newPage();
    best = await fallback.content();
  }
  return best;
}

export async function closeManualVerification(): Promise<void> {
  if (!manualBrowser) return;
  const browser = manualBrowser;
  manualBrowser = null;
  manualBrowserId = null;
  await browser.close().catch(() => undefined);
}

export function getManualBrowserId(): string | null {
  return manualBrowserId;
}

export function findBrowserPath(id: string): string | null {
  const def = BROWSER_DEFS.find((candidate) => candidate.id === id);
  if (!def) return null;
  for (const path of def.paths) {
    if (existsSync(path)) return path;
  }
  return null;
}

function getBrowser(id: string, useProxy = false): Promise<Browser> {
  const cacheKey = `${id}:${useProxy ? "proxy" : "direct"}`;
  const existing = browserCache.get(cacheKey);
  if (existing) return existing;
  const promise = launchBrowser(id, useProxy);
  browserCache.set(cacheKey, promise);
  return promise;
}

export function getHeadlessBrowser(id: string = DEFAULT_BROWSER_ID, useProxy = false): Promise<Browser> {
  return getBrowser(id, useProxy);
}

async function launchBrowser(id: string, useProxy = false): Promise<Browser> {
  const def = BROWSER_DEFS.find((candidate) => candidate.id === id);
  if (!def) throw new Error(`未知浏览器: ${id}`);
  const executablePath = findBrowserPath(id);
  if (!executablePath) {
    throw new Error(`未找到本机 ${def.label} 浏览器（${def.paths[0]}）`);
  }
  const args = [
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--lang=zh-CN",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--window-size=1366,900",
  ];
  if (useProxy) {
    // 仅国际检索（DDG/TradeWheel 等）走代理，国内平台渲染直连
    const proxyUrl = (process.env.CRAWLER_PROXY || "").trim();
    if (proxyUrl && /^https?:\/\//i.test(proxyUrl)) {
      args.push(`--proxy-server=${proxyUrl.replace(/^https?:\/\//i, "")}`);
    }
  }
  return puppeteer.launch({
    executablePath,
    headless: true,
    browser: def.kind === "firefox" ? "firefox" : "chrome",
    args,
  });
}
