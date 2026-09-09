import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthVendorId, getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "admin" && vendor.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
