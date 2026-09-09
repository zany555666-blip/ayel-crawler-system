import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthVendorId, getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendorId = await getAuthVendorId();
  const user = await getAuthUser();
  if (!vendorId || !user) return unauthorized();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "admin" && product.vendorId !== vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
