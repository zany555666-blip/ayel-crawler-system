import "server-only";
import { prisma } from "@/lib/db";
import { enrichCustomerLeadsHttp } from "@/lib/crawler/customers";

export async function processPendingEnrichment(limit = 2): Promise<number> {
  const configs = await prisma.crawlerConfig.findMany({
    where: { autoMarketing: true },
    select: { userId: true },
  });
  if (configs.length === 0) return 0;

  let enriched = 0;
  for (const cfg of configs) {
    const leads = await prisma.customer.findMany({
      where: {
        createdBy: cfg.userId,
        email: null,
        website: { not: null },
      },
      select: { id: true, name: true, company: true, website: true },
      take: limit,
    });
    if (leads.length === 0) continue;

    const parsed = leads.map((l) => ({
      name: l.name || l.company || "",
      company: l.company || "",
      website: l.website,
      email: undefined,
      phone: undefined,
      country: "",
      source: "auto-enrich",
    }));

    let enrichedLeads: Awaited<ReturnType<typeof enrichCustomerLeadsHttp>> = [];
    try {
      enrichedLeads = await enrichCustomerLeadsHttp(parsed as any);
    } catch {
      continue;
    }

    const gained: { id: string; email: string; name: string; company?: string | null }[] = [];
    for (let i = 0; i < leads.length; i += 1) {
      const found = enrichedLeads[i]?.email;
      if (!found || !found.includes("@")) continue;
      await prisma.customer.update({
        where: { id: leads[i].id },
        data: { email: found },
      });
      gained.push({ id: leads[i].id, email: found, name: leads[i].name || "", company: leads[i].company });
      enriched += 1;
    }

    if (gained.length > 0) {
      await enqueueLeadsToMarketing(cfg.userId, gained).catch(() => undefined);
    }
  }
  return enriched;
}

export interface EnqueueLead {
  id: string;
  email: string | null;
  name: string;
  company?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
}

export async function enqueueLeadsToMarketing(
  userId: string,
  leads: EnqueueLead[]
): Promise<{ emailQueued: number; platformQueued: number }> {
  const config = await prisma.crawlerConfig.findUnique({ where: { userId } });
  if (!config || !config.autoMarketing) return { emailQueued: 0, platformQueued: 0 };

  const blacklist = await prisma.blacklistEntry.findMany({ where: { userId }, select: { email: true } });
  const blocked = new Set(blacklist.map((b) => b.email));

  let campaignId = config.autoCampaignId;
  if (campaignId) {
    const existing = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!existing || existing.userId !== userId) campaignId = null;
  }

  if (!campaignId) {
    const active = await prisma.campaign.findFirst({
      where: { userId, status: { in: ["draft", "scheduled", "running", "paused"] } },
      orderBy: { createdAt: "asc" },
    });
    if (active) {
      campaignId = active.id;
    } else {
      const created = await prisma.campaign.create({
        data: {
          userId,
          name: "自动营销（采集线索）",
          customerType: "overseas",
          status: "running",
          emailType: "cold_outreach",
          language: "en",
          intervalMin: 15,
          batchSize: 5,
          maxPerDay: 50,
          nextRunAt: new Date(),
        },
      });
      campaignId = created.id;
    }
  }

  // 邮件通道收件人
  const emailLeads = leads.filter((l) => l.email && l.email.includes("@") && !blocked.has(l.email));
  // 平台通道收件人（TradeWheel 询盘且带详情页 URL，零配置自动分流）
  const platformLeads = leads.filter(
    (l) =>
      /tradewheel/i.test(l.source || "") &&
      l.sourceUrl &&
      /tradewheel\.com\/buyers\//i.test(l.sourceUrl)
  );

  let emailQueued = 0;
  for (const l of emailLeads) {
    try {
      await prisma.campaignRecipient.create({
        data: {
          campaignId: campaignId!,
          customerId: l.id,
          email: l.email!,
          customerName: l.name,
          channel: "email",
        },
      });
      emailQueued += 1;
    } catch {
      // 已存在（campaignId+email 唯一）
    }
  }

  let platformQueued = 0;
  for (const l of platformLeads) {
    try {
      await prisma.campaignRecipient.create({
        data: {
          campaignId: campaignId!,
          customerId: l.id,
          email: `tradewheel-${l.id}@platform.local`,
          customerName: l.name,
          channel: "tradewheel",
          threadUrl: l.sourceUrl,
        },
      });
      platformQueued += 1;
    } catch {
      // 已存在
    }
  }

  const added = emailQueued + platformQueued;
  if (added > 0) {
    await prisma.campaign.update({
      where: { id: campaignId! },
      data: { status: "running", nextRunAt: new Date() },
    });
  }

  return { emailQueued, platformQueued };
}