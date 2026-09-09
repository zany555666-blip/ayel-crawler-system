import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const emails = await prisma.email.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(emails);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { customerId, vendorId, toAddress, subject, body, language } = await req.json();

  const email = await prisma.email.create({
    data: {
      customerId,
      vendorId,
      userId: user.id,
      toAddress,
      fromAddress: user.email,
      subject,
      body,
      language: language || "en",
      type: "outbound",
    },
  });

  return NextResponse.json(email);
}
