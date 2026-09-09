import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const accounts = await prisma.emailAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, smtpHost: true, smtpPort: true, dailyLimit: true, sentToday: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const data = await req.json();
  try {
    const account = await prisma.emailAccount.create({
      data: {
        userId: user.id,
        email: data.email,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort || 587,
        smtpUser: data.smtpUser || data.email,
        smtpPass: encrypt(data.smtpPass || ""),
        dailyLimit: data.dailyLimit || 50,
      },
    });
    return NextResponse.json({ id: account.id, email: account.email, smtpHost: account.smtpHost, smtpPort: account.smtpPort, dailyLimit: account.dailyLimit, sentToday: 0, isActive: account.isActive });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
