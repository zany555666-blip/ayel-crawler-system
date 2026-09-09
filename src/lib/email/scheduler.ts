import "server-only";
import { prisma } from "@/lib/db";
import { runAgent } from "@/lib/ai/agent";
import { sendEmail } from "@/lib/email/mailer";
import { getAvailableSmtpAccount, incrementSentToday, getEnvSmtpConfig } from "@/lib/email/accounts";
import { sendTradeWheelContactQuote } from "@/lib/crawler/tradewheel-chat";

export interface BatchResult {
  sent: number;
  total: number;
  stopped?: "window" | "limit" | "done";
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isWithinSendWindow(campaign: {
  startHour: number | null;
  endHour: number | null;
}): boolean {
  if (campaign.startHour == null || campaign.endHour == null) return true;
  const hour = new Date().getHours();
  if (campaign.startHour <= campaign.endHour) {
    return hour >= campaign.startHour && hour < campaign.endHour;
  }
  // 跨天窗口，如 22:00 - 次日 06:00
  return hour >= campaign.startHour || hour < campaign.endHour;
}

function nextWindowTime(campaign: {
  startHour: number | null;
  endHour: number | null;
}): Date {
  if (campaign.startHour == null) return new Date(Date.now() + 60 * 60 * 1000);
  const now = new Date();
  const next = new Date(now);
  next.setHours(campaign.startHour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function inferSmtpHost(email: string): string {
  const domain = (email.split("@")[1] || "").toLowerCase();
  if (domain.includes("qq")) return "smtp.qq.com";
  if (domain.includes("163") || domain.includes("126")) return "smtp.163.com";
  if (domain.includes("gmail")) return "smtp.gmail.com";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) return "smtp.office365.com";
  if (domain.includes("sina")) return "smtp.sina.com.cn";
  return "smtp." + domain;
}

export async function sendCampaignBatch(
  campaignId: string,
  userId: string
): Promise<BatchResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.userId !== userId) {
    return { sent: 0, total: 0, stopped: "done" };
  }

  // 定时窗口检查
  if (!isWithinSendWindow(campaign)) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { nextRunAt: nextWindowTime(campaign) },
    });
    return { sent: 0, total: 0, stopped: "window" };
  }

  // 日限额：统计今日已发送
  const todaySent = await prisma.campaignRecipient.count({
    where: {
      campaignId,
      status: "sent",
      sentAt: { gte: startOfToday() },
    },
  });
  const remainingToday = Math.max(0, (campaign.maxPerDay || 200) - todaySent);
  if (remainingToday <= 0) {
    // 达到日限额，推到明天再发
    const tomorrow = startOfToday();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (campaign.startHour != null) tomorrow.setHours(campaign.startHour, 0, 0, 0);
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { nextRunAt: tomorrow },
    });
    return { sent: 0, total: 0, stopped: "limit" };
  }

  // 待发送队列
  const pendingCount = await prisma.campaignRecipient.count({
    where: { campaignId, status: "pending" },
  });
  if (pendingCount === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed", nextRunAt: null },
    });
    return { sent: 0, total: pendingCount, stopped: "done" };
  }

  // 无正文时自动生成开发信（AI，失败用默认模板）
  let emailSubject = campaign.emailSubject || "";
  let emailBody = campaign.emailBody || "";
  if (!emailSubject || !emailBody) {
    try {
      const lang = campaign.language || "en";
      const context = `Generate a ${campaign.emailType === "cold_outreach" ? "cold outreach" : campaign.emailType === "new_product" ? "new product promotion" : "follow-up"} email in ${lang}. Company: Liangyou Technology. Products: electronic components, sensors, controllers, communication equipment. Target: ${campaign.customerType === "overseas" ? "international buyers" : "domestic clients"}.`;
      const result = await runAgent({
        task: "draft_email",
        context,
        userId,
        params: { creative: true },
      });
      const lines = result.split("\n");
      emailSubject = lines[0].replace(/^Subject:\s*/i, "").trim() || "Business Cooperation - Liangyou Technology";
      emailBody = result;
    } catch {
      emailSubject = "Partnership Opportunity - Liangyou Technology";
      emailBody = "Dear Sir/Madam,\n\nWe are Liangyou Technology, a leading manufacturer of electronic components and industrial sensors.\n\nWe would like to explore cooperation opportunities.\n\nBest regards,\nLiangyou Technology";
    }
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { emailSubject, emailBody },
    });
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "pending" },
    take: Math.min(campaign.batchSize || 5, remainingToday),
  });

  const customerIds = recipients.map((r) => r.customerId).filter(Boolean) as string[];
  const customers = customerIds.length > 0
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, company: true, contactName: true, source: true, notes: true },
      })
    : [];
  const custMap = new Map(customers.map((c) => [c.id, c]));

  const blacklist = await prisma.blacklistEntry.findMany({
    where: { userId },
    select: { email: true },
  });
  const blockedEmails = new Set(blacklist.map((b) => b.email));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = emailBody;

  // 链接转点击跟踪
  let trackedBody = body;
  try {
    trackedBody = body.replace(/href=["'](https?:\/\/[^"']+)["']/gi, (m, link: string) => {
      const enc = encodeURIComponent(link);
      return `href="${appUrl}/api/tracking/click?url=${enc}&email={{EMAIL}}&cid=${campaignId}"`;
    });
    trackedBody = trackedBody.replace(/(https?:\/\/[^\s<"']+)/g, (m, link: string) => {
      if (/tracking\/click/.test(m)) return m;
      const enc = encodeURIComponent(link);
      return `${appUrl}/api/tracking/click?url=${enc}&email={{EMAIL}}&cid=${campaignId}`;
    });
  } catch {}

  const openPixel = `<img src="${appUrl}/api/tracking/open?email={{EMAIL}}&cid=${campaignId}" width="1" height="1" alt="" style="display:none" />`;
  const fullBody = trackedBody.includes("{{EMAIL}}")
    ? trackedBody + "\n" + openPixel
    : trackedBody + `\n\n---\nTo unsubscribe, click: ${appUrl}/api/tracking/unsubscribe?email={{EMAIL}}&userId=${userId}\n` + openPixel;

  let sent = 0;
  const twFrom = {
    name: process.env.TRADEWHEEL_FROM_NAME || "Liangyou Technology",
    email: process.env.TRADEWHEEL_FROM_EMAIL || process.env.SMTP_USER || "",
    phone: process.env.TRADEWHEEL_FROM_PHONE || "",
  };
  const cfgSender = await prisma.crawlerConfig
    .findUnique({
      where: { userId },
      select: { senderEmail: true, senderSmtpHost: true, senderSmtpPort: true, senderSmtpPass: true },
    })
    .then((c) => c || null);
  const senderEmail = cfgSender?.senderEmail || twFrom.email;
  // 配置了邮箱+授权码 → 该邮箱即真实 SMTP 账号，直接发送
  const customSmtp =
    cfgSender?.senderEmail && cfgSender.senderSmtpPass
      ? {
          id: undefined,
          host: cfgSender.senderSmtpHost || inferSmtpHost(cfgSender.senderEmail),
          port: cfgSender.senderSmtpPort || 465,
          user: cfgSender.senderEmail,
          pass: cfgSender.senderSmtpPass,
          email: cfgSender.senderEmail,
        }
      : null;
  for (const r of recipients) {
    // 平台站内信通道
    if (r.channel === "tradewheel") {
      try {
        if (!r.threadUrl) {
          await prisma.campaignRecipient.update({
            where: { id: r.id },
            data: { status: "bounced", error: "缺少平台详情页地址" },
          });
          continue;
        }
        const cust = r.customerId ? custMap.get(r.customerId) : undefined;
        const inquiryDesc = cust?.notes || "";
        let message = "";
        try {
          const reply = await runAgent({
            task: "inquiry_reply",
            context: `Buyer inquiry details: ${inquiryDesc.slice(0, 1200)}. Company: ${twFrom.name}. Write a concise professional reply quoting a ballpark price range and MOQ, ask 2-3 clarifying questions.`,
            userId,
            params: { creative: true },
          });
          message = reply.slice(0, 2000);
        } catch {
          message = `Dear Buyer,\n\nThank you for your inquiry. ${twFrom.name} is a professional supplier. Please share your required specifications and quantity, and we will send our best quotation.\n\nBest regards,\n${twFrom.name}`;
        }
        const result = await sendTradeWheelContactQuote({
          detailUrl: r.threadUrl,
          name: twFrom.name,
          email: senderEmail,
          phone: twFrom.phone,
          company: twFrom.name,
          message,
        });
        await prisma.campaignRecipient.update({
          where: { id: r.id },
          data: {
            status: result.success ? "sent" : "bounced",
            error: result.success ? null : result.error,
            sentAt: result.success ? new Date() : null,
          },
        });
        if (result.success) sent += 1;
      } catch {
        // 单条失败不中断批次
      }
      continue;
    }

    // 邮件通道
    if (blockedEmails.has(r.email)) {
      await prisma.campaignRecipient.update({
        where: { id: r.id },
        data: { status: "bounced", error: "blacklisted" },
      });
      continue;
    }
    try {
      const cust = r.customerId ? custMap.get(r.customerId) : undefined;
      const name = cust?.contactName || r.customerName || "";
      const company = cust?.company || "";

      // 询盘类来源（TradeWheel 等求购线索）：按求购需求生成针对性回复，而非群发模板
      const isInquiry = !!cust && /tradewheel|inquiry|buyoffer|demand/i.test(cust.source || "");
      const inquiryDesc = cust?.notes || "";
      let mailSubject = emailSubject;
      let mailBody = emailBody;
      if (isInquiry && inquiryDesc) {
        try {
          const lang = campaign.language || "en";
          const reply = await runAgent({
            task: "inquiry_reply",
            context: `Buyer inquiry details: ${inquiryDesc.slice(0, 1500)}. Company: Liangyou Technology. Products: electronic components, sensors, controllers, communication equipment. Write a professional reply in ${lang} quoting a ballpark price and requesting more specifications.`,
            userId,
            params: { creative: true },
          });
          const lines = reply.split("\n");
          mailSubject = `Re: Your inquiry - ${company || "Purchase Request"}`;
          mailBody = reply;
          void lines;
        } catch {
          // AI 失败时退回 campaign 模板
        }
      }

      const personalizedBody = (mailBody + "\n")
        .replace(/\{\{EMAIL\}\}/g, r.email)
        .replace(/\{\{NAME\}\}/g, name || "Sir/Madam")
        .replace(/\{\{COMPANY\}\}/g, company || "your company");
      const account = customSmtp || (await getAvailableSmtpAccount(userId)) || getEnvSmtpConfig();
      const result = await sendEmail(r.email, mailSubject, personalizedBody, account || undefined, senderEmail);
      if (result.success) {
        await prisma.campaignRecipient.update({
          where: { id: r.id },
          data: { status: "sent", sentAt: new Date(), messageId: result.messageId },
        });
        await incrementSentToday(account?.id);
        sent += 1;
      } else {
        await prisma.campaignRecipient.update({
          where: { id: r.id },
          data: { status: "bounced", error: result.error },
        });
        await prisma.blacklistEntry.upsert({
          where: { userId_email: { userId, email: r.email } },
          update: {},
          create: { userId, email: r.email, reason: "bounced" },
        });
      }
    } catch {
      // 单封失败不中断批次
    }
  }

  const stillPending = await prisma.campaignRecipient.count({
    where: { campaignId, status: "pending" },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "running",
      totalSent: { increment: sent },
      lastRunAt: new Date(),
      nextRunAt: stillPending > 0 ? new Date(Date.now() + (campaign.intervalMin || 10) * 60 * 1000) : null,
    },
  });

  return { sent, total: pendingCount, stopped: stillPending > 0 ? undefined : "done" };
}

export async function maybeRunDueCampaigns(userId?: string): Promise<void> {
  const where: any = { status: "running", nextRunAt: { lte: new Date() } };
  if (userId) where.userId = userId;
  const due = await prisma.campaign.findMany({ where, select: { id: true, userId: true } });
  for (const c of due) {
    try {
      await sendCampaignBatch(c.id, c.userId);
    } catch {
      // 单批失败不影响其他
    }
  }
}