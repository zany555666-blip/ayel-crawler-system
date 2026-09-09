import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const config = await prisma.crawlerConfig.findUnique({ where: { userId: user.id } });
  return NextResponse.json(config || {});
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const vendorSources = normalizeJsonArray(body.vendorSources, ["1688"]);
  const customerSources = normalizeJsonArray(body.customerSources, ["GlobalSources"]);
  const vendorKeywords = nonEmpty(body.vendorKeywords, "传感器,控制器,自动化设备");
  const customerKeywords = nonEmpty(body.customerKeywords, "industrial sensors,automation,controllers");
  const targetCountries = nonEmpty(body.targetCountries, "Germany,USA,Mexico,Brazil,UAE");
  const crawlMode = body.crawlMode === "headless" ? "headless" : "http";
  const headlessBrowsers = normalizeJsonArray(body.headlessBrowsers, ["edge"]);
  const marketMode = ["domestic", "overseas", "global"].includes(String(body.marketMode)) ? String(body.marketMode) : "global";
  const autoMarketing = body.autoMarketing === true || body.autoMarketing === "true";
  const autoCampaignId = body.autoCampaignId ? String(body.autoCampaignId) : null;
  const senderEmail = String(body.senderEmail || "").trim() || null;
  const senderSmtpHost = String(body.senderSmtpHost || "").trim() || null;
  const senderSmtpPort = body.senderSmtpPort ? Math.min(65535, Math.max(1, Number(body.senderSmtpPort) || 465)) : null;
  const senderSmtpPass = String(body.senderSmtpPass || "").trim() || null;
  const config = await prisma.crawlerConfig.upsert({
    where: { userId: user.id },
    update: {
      vendorSources: JSON.stringify(vendorSources),
      vendorKeywords,
      vendorPages: Math.min(3, Math.max(1, Number(body.vendorPages) || 1)),
      requestDelayMs: Math.max(500, Number(body.requestDelayMs) || 1200),
      crawlMode,
      headlessBrowsers: JSON.stringify(headlessBrowsers),
      crawlInterval: String(body.crawlInterval || "daily"),
      customerSources: JSON.stringify(customerSources),
      customerKeywords,
      targetCountries,
      marketMode,
      autoMarketing,
      autoCampaignId,
      senderEmail,
      senderSmtpHost,
      senderSmtpPort,
      senderSmtpPass,
    },
    create: {
      userId: user.id,
      vendorSources: JSON.stringify(vendorSources),
      vendorKeywords,
      vendorPages: Math.min(3, Math.max(1, Number(body.vendorPages) || 1)),
      requestDelayMs: Math.max(500, Number(body.requestDelayMs) || 1200),
      crawlMode,
      headlessBrowsers: JSON.stringify(headlessBrowsers),
      crawlInterval: String(body.crawlInterval || "daily"),
      customerSources: JSON.stringify(customerSources),
      customerKeywords,
      targetCountries,
      marketMode,
      autoMarketing,
      autoCampaignId,
      senderEmail,
      senderSmtpHost,
      senderSmtpPort,
      senderSmtpPass,
    },
  });

  return NextResponse.json(config);
}

function normalizeJsonArray(value: unknown, fallback: string[]): string[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Use defaults for malformed form values.
  }
  return fallback;
}

function nonEmpty(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}
