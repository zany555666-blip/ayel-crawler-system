import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { crawlCustomerLeads } from "@/lib/crawler/customers";
import { enqueueLeadsToMarketing } from "@/lib/email/auto-enqueue";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const config = await prisma.crawlerConfig.findUnique({ where: { userId } });
    const keyword = String(body.keyword || config?.customerKeywords || "industrial sensors").split(",")[0].trim();
    const countries = String(body.countries || config?.targetCountries || "Germany,USA,Mexico,Brazil,UAE")
      .split(",").map((item) => item.trim()).filter(Boolean);
    let buyerSources: string[] = [];
    let marketMode: "domestic" | "overseas" | "global" = "global";
    try {
      const saved = JSON.parse(config?.customerSources || "[]");
      if (Array.isArray(saved)) buyerSources = saved.filter((s) => typeof s === "string");
    } catch {
      buyerSources = [];
    }
    if (Array.isArray(body.buyerSources)) {
      buyerSources = body.buyerSources.filter((s: unknown) => typeof s === "string");
    }
    const modeVal = String(body.marketMode || config?.marketMode || "global");
    if (modeVal === "domestic" || modeVal === "overseas") marketMode = modeVal;
    const result = await crawlCustomerLeads(keyword, countries, 10, {
      mode: body.mode === "headless" || config?.crawlMode === "headless" ? "headless" : "http",
      userId,
      marketMode,
      buyerSources,
    });

    if (body.preview) return NextResponse.json(result);
    const created = [];
    for (const lead of result.leads) {
      const exists = await prisma.customer.findFirst({
        where: { createdBy: userId, OR: [{ email: lead.email || "__none__" }, { company: lead.company }] },
      });
      if (exists) continue;
      created.push(await prisma.customer.create({
        data: {
          name: lead.name,
          company: lead.company,
          contactName: lead.contactName || null,
          email: lead.email || null,
          phone: lead.phone || null,
          country: lead.country || null,
          industry: lead.industry || null,
          website: lead.website || null,
          sourceUrl: lead.sourceUrl || null,
          customerType: "overseas",
          source: lead.source,
          status: "lead",
          notes: lead.notes,
          createdBy: userId,
        },
      }));
    }

    let enqueued = 0;
    let platformQueued = 0;
    if (created.length > 0) {
      const queueResult = await enqueueLeadsToMarketing(
        userId,
        created.map((c) => ({
          id: c.id,
          email: c.email as string | null,
          name: c.name,
          company: c.company as string | null,
          source: c.source as string | null,
          sourceUrl: c.sourceUrl as string | null,
        }))
      ).catch(() => ({ emailQueued: 0, platformQueued: 0 }));
      enqueued = queueResult.emailQueued;
      platformQueued = queueResult.platformQueued;
    }

    return NextResponse.json({ ...result, created, createdCount: created.length, enqueued, platformQueued });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "客户采集失败" }, { status: 500 });
  }
}
