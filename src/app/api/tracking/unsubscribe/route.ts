import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const userId = req.nextUrl.searchParams.get("userId");
  if (!email || !userId) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  await prisma.blacklistEntry.upsert({
    where: { userId_email: { userId, email } },
    update: { reason: "unsubscribed" },
    create: { userId, email, reason: "unsubscribed" },
  });

  // Update any pending/sent recipients for this email
  await prisma.campaignRecipient.updateMany({
    where: { email, status: { in: ["pending", "sent", "opened"] } },
    data: { status: "unsubscribed" },
  });

  return new NextResponse("You have been unsubscribed. We will not send you any more emails.", { status: 200 });
}
