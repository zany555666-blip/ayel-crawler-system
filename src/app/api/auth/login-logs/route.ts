import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const logs = await prisma.loginLog.findMany({
    where: user.role === "admin" ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      email: l.email,
      ip: l.ip,
      userAgent: l.userAgent,
      success: l.success,
      createdAt: l.createdAt,
    }))
  );
}