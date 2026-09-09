import { fetchHtml } from "@/lib/crawler";
import { generateStructuredOutput } from "./agent";
import { fetchImportYetiData, YetiCompanyData } from "./importyeti";
import { z } from "zod";
import * as cheerio from "cheerio";

const backgroundCheckSchema = z.object({
  companyOverview: z.string().describe("公司概况：主营业务、行业、所在地、成立与规模线索，基于检索到的公开信息"),
  registrationSignals: z.string().describe("注册与合法性线索（注册地/注册号/认证资质），未找到写「未发现明显注册信息」"),
  scaleSignals: z.string().describe("经营规模信号（员工数量/营收/市场覆盖/平台表现），未找到写「未发现明显规模信息」"),
  industryFit: z.string().describe("与我方印刷辅料供应链的匹配度评估"),
  riskFlags: z.array(z.string()).describe("风险红旗列表（信息缺失、注册信息存疑、联系方式异常、无官网等），无风险写空数组"),
  trustScore: z.number().min(0).max(100).describe("综合信任评分，0-100"),
  recommendations: z.array(z.string()).describe("跟进建议（何时联系、核实哪些信息、注意什么）"),
  supplierRelationships: z.string().describe("海关记录揭示的供应链关系：上游供应商是谁、下游客户是谁、采购结构特点；无海关记录时写「未发现海关记录」"),
});

export type BackgroundCheckReport = z.infer<typeof backgroundCheckSchema>;

export interface BackgroundCheckInput {
  name: string;
  country?: string;
  industry?: string;
  website?: string;
  lang: "zh" | "en";
}

export interface BackgroundCheckSource {
  title: string;
  url: string;
  snippet?: string;
}

interface CacheEntry {
  time: number;
  result: BackgroundCheckResult;
}

export interface BackgroundCheckResult {
  report: BackgroundCheckReport;
  sources: BackgroundCheckSource[];
  customs?: YetiCompanyData | null;
  retrievedAt: string;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(userId: string, input: BackgroundCheckInput) {
  return `${userId}:${input.name.toLowerCase()}:${input.country || ""}:${input.website || ""}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchBingRss(query: string, max = 6): Promise<BackgroundCheckSource[]> {
  try {
    const rssHtml = await fetchHtml(
      `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`,
      {},
      1
    );
    const $ = cheerio.load(rssHtml, { xmlMode: true });
    const sources: BackgroundCheckSource[] = [];
    const seen = new Set<string>();
    $("item").each((_, el) => {
      if (sources.length >= max) return;
      const title = $("title", el).text().replace(/\s+/g, " ").trim();
      const link = $("link", el).text().trim();
      const desc = $("description", el).text().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!link || !title || seen.has(link)) return;
      if (/bing\.com|microsoft\.com/i.test(link)) return;
      seen.add(link);
      sources.push({ title, url: link, snippet: desc.slice(0, 300) });
    });
    return sources;
  } catch {
    return [];
  }
}

async function fetchWebsiteText(website?: string): Promise<string> {
  if (!website) return "";
  const url = website.startsWith("http") ? website : `https://${website}`;
  try {
    const html = await fetchHtml(url, {}, 1);
    const text = stripHtml(html);
    return text.length > 4500 ? text.slice(0, 4500) : text;
  } catch {
    return "";
  }
}

export async function runBackgroundCheck(
  input: BackgroundCheckInput,
  userId: string
): Promise<BackgroundCheckResult> {
  const key = cacheKey(userId, input);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.result;
  }

  const queries = [
    [input.name, input.country, input.industry].filter(Boolean).join(" "),
    [input.name, input.country].filter(Boolean).join(" "),
  ];

  const searchResults: BackgroundCheckSource[] = [];
  for (const q of queries) {
    const found = await searchBingRss(q);
    for (const s of found) {
      if (!searchResults.some((x) => x.url === s.url)) searchResults.push(s);
    }
    if (searchResults.length >= 6) break;
  }

  const websiteText = await fetchWebsiteText(input.website);

  const customs = await fetchImportYetiData(input.name);

  const customsSection = customs.found
    ? `海关记录（ImportYeti 美国进口数据，可能与同名公司混淆，请先判断是否同一家公司）：
共 ${customs.suppliers.length} 家供应商：
${customs.suppliers
  .slice(0, 8)
  .map((s) => `- ${s.name}（${s.country}）历史 ${s.totalShipments ?? "?"} 票，占 ${s.percent ?? "?"}%`)
  .join("\n")}
下游客户：${customs.topCustomers.slice(0, 5).map((c) => c.name).join("、") || "未披露"}`
    : "海关记录：ImportYeti 未查询到该公司记录。";

  const langHint = input.lang === "zh" ? "请用简体中文输出所有字段内容。" : "Answer all fields in English.";
  const prompt = `对以下公司进行贸易背调分析，仅基于提供的公开信息，不要编造未提及的事实。

公司名称：${input.name}
国家/地区：${input.country || "未知"}
行业：${input.industry || "未知"}
参考官网：${input.website || "未提供"}

搜索引擎检索到的公开信息：
${searchResults
  .map((s, i) => `${i + 1}. [${s.title}] ${s.url}\n   ${s.snippet || ""}`)
  .join("\n") || "（搜索引擎未返回有效结果，请注意信息缺失风险）"}

官网页面文本（如有）：
${websiteText ? websiteText : "（未获取到官网文本）"}

${customsSection}

${langHint}
信息缺失的维度请如实标注为缺失，不要推测编造。`;

  const report = await generateStructuredOutput(prompt, backgroundCheckSchema, userId);

  const result: BackgroundCheckResult = {
    report,
    sources: searchResults,
    customs,
    retrievedAt: new Date().toISOString(),
  };
  cache.set(key, { time: Date.now(), result });
  return result;
}