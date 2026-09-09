import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const campaignId = req.nextUrl.searchParams.get("cid");
  if (!email) return new NextResponse("ok", { status: 200 });

  try {
    const recipient = await prisma.campaignRecipient.findFirst({
      where: { email, campaignId: campaignId || undefined, status: "sent" },
      orderBy: { sentAt: "desc" },
    });
    if (recipient) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "opened", openedAt: recipient.openedAt || new Date(), openCount: { increment: 1 } },
      });
      await prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { totalOpened: { increment: 1 } },
      });
    }
  } catch {}

  // Return 1x1 transparent pixel
  const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(pixel, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-cache" } });
}
