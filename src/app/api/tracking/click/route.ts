import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const email = req.nextUrl.searchParams.get("email");
  const campaignId = req.nextUrl.searchParams.get("cid");

  if (!url || !/^https?:\/\//i.test(url)) {
    return new NextResponse("invalid", { status: 400 });
  }

  try {
    if (email) {
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { email, campaignId: campaignId || undefined, status: { in: ["sent", "opened", "clicked"] } },
        orderBy: { sentAt: "desc" },
      });
      if (recipient) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "clicked",
            clickedAt: recipient.clickedAt || new Date(),
            clickCount: { increment: 1 },
          },
        });
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: { totalClicked: { increment: 1 } },
        });
        await prisma.trackingPixel.create({
          data: { email, campaignId: recipient.campaignId, type: "click", url },
        });
      }
    }
  } catch {}

  return NextResponse.redirect(url);
}