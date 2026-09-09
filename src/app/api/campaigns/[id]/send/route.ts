import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { runAgent } from "@/lib/ai/agent";
import { sendCampaignBatch, maybeRunDueCampaigns } from "@/lib/email/scheduler";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // 先推进其他到期任务
    await maybeRunDueCampaigns(user.id);

    // Get customers
    const customerWhere: any = { createdBy: user.id };
    if (campaign.customerType === "overseas") customerWhere.customerType = "overseas";
    if (campaign.customerType === "domestic") customerWhere.customerType = "domestic";

    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: { id: true, name: true, email: true, contactName: true, company: true, country: true, source: true, sourceUrl: true },
    });

    const blacklist = await prisma.blacklistEntry.findMany({
      where: { userId: user.id },
      select: { email: true },
    });
    const blockedEmails = new Set(blacklist.map((b) => b.email));

    // 邮件渠道收件人：有邮箱且未拉黑
    const emailTargets = customers.filter(
      (c) => c.email && c.email.includes("@") && !blockedEmails.has(c.email)
    );
    // 平台渠道收件人：TradeWheel 询盘且带详情页地址（零配置自动分流）
    const platformTargets = customers.filter(
      (c) =>
        !c.email &&
        /tradewheel/i.test(c.source || "") &&
        c.sourceUrl &&
        /tradewheel\.com\/buyers\//i.test(c.sourceUrl)
    );

    if (emailTargets.length === 0 && platformTargets.length === 0) {
      return NextResponse.json(
        {
          error: "no_valid_recipients",
          detail: {
            totalCustomers: customers.length,
            withEmail: customers.filter((c) => c.email && c.email.includes("@")).length,
            blocked: customers.filter((c) => c.email && c.email.includes("@") && blockedEmails.has(c.email)).length,
            platform: platformTargets.length,
          },
        },
        { status: 400 }
      );
    }

    // Generate AI email if no body set
    let subject = campaign.emailSubject || "";
    let body = campaign.emailBody || "";
    if (!subject || !body) {
      try {
        const lang = campaign.language || "en";
        const context = `Generate a ${campaign.emailType === "cold_outreach" ? "cold outreach" : campaign.emailType === "new_product" ? "new product promotion" : "follow-up"} email in ${lang}. Company: Liangyou Technology. Products: electronic components, sensors, controllers, communication equipment. Target: ${campaign.customerType === "overseas" ? "international buyers" : "domestic clients"}.`;
        const result = await runAgent({
          task: "draft_email",
          context,
          userId: user.id,
          params: { creative: true },
        });
        const lines = result.split("\n");
        subject = lines[0].replace(/^Subject:\s*/i, "").trim() || `Business Cooperation - Liangyou Technology`;
        body = result;
        await prisma.campaign.update({
          where: { id },
          data: { emailSubject: subject, emailBody: body },
        });
      } catch {
        subject = "Partnership Opportunity - Liangyou Technology";
        body = "Dear Sir/Madam,\n\nWe are Liangyou Technology, a leading manufacturer of electronic components and industrial sensors.\n\nWe would like to explore cooperation opportunities.\n\nBest regards,\nLiangyou Technology";
      }
    }

    // Create recipients (dedupe by campaign+customer)
    for (const c of emailTargets) {
      try {
        await prisma.campaignRecipient.create({
          data: {
            campaignId: id,
            customerId: c.id,
            email: c.email!,
            customerName: c.name,
            channel: "email",
          },
        });
      } catch {}
    }
    for (const c of platformTargets) {
      try {
        await prisma.campaignRecipient.create({
          data: {
            campaignId: id,
            customerId: c.id,
            email: `tradewheel-${c.id}@platform.local`,
            customerName: c.name,
            channel: "tradewheel",
            threadUrl: c.sourceUrl,
          },
        });
      } catch {}
    }

    // 发送第一批（受定时窗口与日限额约束）
    const result = await sendCampaignBatch(id, user.id);

    const totalTargets = emailTargets.length + platformTargets.length;
    return NextResponse.json({ success: true, sent: result.sent, total: totalTargets, stopped: result.stopped || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}