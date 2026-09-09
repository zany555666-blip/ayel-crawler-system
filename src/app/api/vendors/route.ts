import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const vendors = await prisma.vendor.findMany({
    where: user.role === "admin" ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(vendors);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const where = user.role === "admin"
      ? { id: { in: ids } }
      : { id: { in: ids }, userId: user.id };
    const result = await prisma.vendor.deleteMany({ where });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `批量删除失败：${error instanceof Error ? error.message : "存在关联数据（产品/订单），请先删除关联记录"}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const data = await req.json();

  const existing = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  if (existing) {
    const updated = await prisma.vendor.update({
      where: { userId: user.id },
      data: {
        name: data.name ?? existing.name,
        contactName: data.contactName ?? existing.contactName,
        email: data.email ?? existing.email,
        phone: data.phone ?? existing.phone,
        address: data.address ?? existing.address,
        country: data.country ?? existing.country,
        website: data.website ?? existing.website,
        category: data.category ?? existing.category,
        status: data.status ?? existing.status,
        rating: typeof data.rating === "number" ? data.rating : existing.rating,
        certificates: data.certificates ?? existing.certificates,
        notes: data.notes ?? existing.notes,
      },
    });
    return NextResponse.json(updated);
  }

  const vendor = await prisma.vendor.create({
    data: {
      name: data.name || "未命名厂商",
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      country: data.country || null,
      website: data.website || null,
      category: data.category || null,
      status: data.status || "active",
      rating: parseInt(data.rating) || 0,
      certificates: data.certificates || null,
      notes: data.notes || null,
      userId: user.id,
    },
  });
  return NextResponse.json(vendor);
}
