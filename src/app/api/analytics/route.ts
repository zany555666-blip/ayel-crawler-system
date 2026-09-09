import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, getAuthVendorId, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  const vendorId = await getAuthVendorId();
  if (!user || !vendorId) return unauthorized();

  const [totalRevenue, totalOrders, avgOrderValue, vendorCount, customerCount] =
    await Promise.all([
      prisma.order.aggregate({
        where: { userId: user.id },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { userId: user.id } }),
      prisma.order.aggregate({
        where: { userId: user.id },
        _avg: { totalAmount: true },
      }),
      prisma.vendor.count({ where: { id: vendorId } }),
      prisma.customer.count({ where: { createdBy: user.id } }),
    ]);

  const customersByStatus = await prisma.customer.groupBy({
    by: ["status"],
    where: { createdBy: user.id },
    _count: { status: true },
  });

  return NextResponse.json({
    summary: {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders,
      avgOrderValue: Number(avgOrderValue._avg.totalAmount || 0),
      vendorCount,
      customerCount,
    },
    customersByStatus: customersByStatus.map((c) => ({
      status: c.status,
      count: c._count.status,
    })),
  });
}
