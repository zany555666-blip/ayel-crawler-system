import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const account = await prisma.emailAccount.findUnique({ where: { id } });
  if (!account || account.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.emailAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
