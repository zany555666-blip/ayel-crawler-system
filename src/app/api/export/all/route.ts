import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, getAuthVendorId, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  const vendorId = await getAuthVendorId();
  if (!user || !vendorId) return unauthorized();

  const [vendors, customers, orders] = await Promise.all([
    prisma.vendor.findMany({ where: { id: vendorId } }),
    prisma.customer.findMany({ where: { createdBy: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      include: { vendor: true },
    }),
  ]);

  const csv = [
    "类型,名称,邮箱,国家,状态",
    ...vendors.map((v) => `厂商,${v.name},${v.email || ""},${v.country || ""},${v.status}`),
    ...customers.map((c) => `客户,${c.name},${c.email || ""},${c.country || ""},${c.status}`),
    ...orders.map((o) => `订单,${o.orderNumber},${o.vendor.name},${o.totalAmount},${o.status}`),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="supplyai-export-${Date.now()}.csv"`,
    },
  });
}
