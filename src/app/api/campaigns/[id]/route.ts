import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { maybeRunDueCampaigns } from "@/lib/email/scheduler";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await maybeRunDueCampaigns(user.id).catch(() => undefined);
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { recipients: true },
  });
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = await req.json();
  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: data.name ?? campaign.name,
      status: data.status ?? campaign.status,
      emailSubject: data.emailSubject ?? campaign.emailSubject,
      emailBody: data.emailBody ?? campaign.emailBody,
      intervalMin: data.intervalMin ?? campaign.intervalMin,
      batchSize: data.batchSize ?? campaign.batchSize,
      maxPerDay: data.maxPerDay ?? campaign.maxPerDay,
      startHour: data.startHour !== undefined ? data.startHour : campaign.startHour,
      endHour: data.endHour !== undefined ? data.endHour : campaign.endHour,
      startAt: data.startAt !== undefined ? data.startAt : campaign.startAt,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
