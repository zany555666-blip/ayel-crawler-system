import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, getAuthVendorId, unauthorized } from "@/lib/auth-utils";

async function getAuthUserAndVendor() {
  const user = await getAuthUser();
  if (!user) return { user: null, vendorId: null };
  const vendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
  return { user, vendorId: vendor?.id || null };
}

export async function GET() {
  const vendorId = await getAuthVendorId();
  if (!vendorId) return unauthorized();

  const products = await prisma.product.findMany({
    where: { vendorId },
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(products);
}

export async function DELETE(req: NextRequest) {
  const vendorId = await getAuthVendorId();
  if (!vendorId) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const result = await prisma.product.deleteMany({ where: { id: { in: ids }, vendorId } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `批量删除失败：${error instanceof Error ? error.message : "存在关联数据（订单明细/知识库），请先删除关联记录"}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, vendorId } = await getAuthUserAndVendor();
  if (!user || !vendorId) return unauthorized();
  const userRole = user.role;
  const currentUserId = user.id;

  try {
    const data = await req.json();
    let targetVendorId = vendorId;
    if (data.vendorId && data.vendorId !== vendorId) {
      if (userRole === "admin") {
        targetVendorId = String(data.vendorId);
      } else {
        const target = await prisma.vendor.findUnique({ where: { id: String(data.vendorId) } });
        if (!target || (target.userId && target.userId !== currentUserId)) {
          return NextResponse.json({ error: "无权为该厂商创建产品" }, { status: 403 });
        }
        targetVendorId = target.id;
      }
    }
    const product = await prisma.product.create({
      data: {
        name: data.name,
        nameEn: data.nameEn || null,
        sku: data.sku,
        category: data.category || null,
        subCategory: data.subCategory || null,
        description: data.description || null,
        descriptionEn: data.descriptionEn || null,
        price: data.price || 0,
        currency: data.currency || "CNY",
        moq: data.moq || 1,
        leadTime: data.leadTime || 15,
        unit: data.unit || "pcs",
        vendorId: targetVendorId,
        isActive: data.isActive ?? true,
        specifications: data.specifications || null,
        certifications: data.certifications || null,
      },
    });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
