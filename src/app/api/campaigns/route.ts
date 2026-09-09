import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { maybeRunDueCampaigns } from "@/lib/email/scheduler";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  await maybeRunDueCampaigns(user.id).catch(() => undefined);
  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const result = await prisma.campaign.deleteMany({ where: { id: { in: ids }, userId: user.id } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: `批量删除失败：${error instanceof Error ? error.message : "未知错误"}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  try {
    const data = await req.json();
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: data.name || "Untitled Campaign",
        customerType: data.customerType || "all",
        emailType: data.emailType || "cold_outreach",
        language: data.language || "en",
        emailSubject: data.emailSubject || null,
        emailBody: data.emailBody || null,
        templateId: data.templateId || null,
        customerTagIds: data.customerTagIds || null,
        intervalMin: data.intervalMin || 10,
        batchSize: data.batchSize || 5,
        maxPerDay: data.maxPerDay || 200,
        startHour: data.startHour == null ? null : Number(data.startHour),
        endHour: data.endHour == null ? null : Number(data.endHour),
        useTimeZone: data.useTimeZone ?? true,
      },
    });
    return NextResponse.json(campaign);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
