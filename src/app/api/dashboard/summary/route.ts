import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  const vendorId = vendor?.id;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    vendorCount, productCount, customerCount, orderCount,
    prevVendor, prevProduct, prevCustomer, prevOrder,
  ] = await Promise.all([
    prisma.vendor.count({ where: { userId } }),
    prisma.product.count({ where: { isActive: true, vendorId: vendorId || "_none_" } }),
    prisma.customer.count({ where: { createdBy: userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.vendor.count({ where: { userId, createdAt: { lt: thirtyDaysAgo } } }),
    prisma.product.count({ where: { isActive: true, vendorId: vendorId || "_none_", createdAt: { lt: thirtyDaysAgo } } }),
    prisma.customer.count({ where: { createdBy: userId, createdAt: { lt: thirtyDaysAgo } } }),
    prisma.order.count({ where: { userId, createdAt: { lt: thirtyDaysAgo } } }),
  ]);

  const calcChange = (now: number, prev: number) => {
    if (prev === 0) return `+${now}`;
    const pct = Math.round(((now - prev) / prev) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const recentOrders = await prisma.order.findMany({
    where: { userId },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { vendor: { select: { name: true } } },
  });

  const trendOrders = await prisma.order.findMany({
    where: { userId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, status: true },
  });

  const months: { key: string; label: string; closed: number; negotiating: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${d.getMonth() + 1}月`,
      closed: 0,
      negotiating: 0,
    });
  }
  for (const o of trendOrders) {
    const m = months.find((x) => x.key === `${o.createdAt.getFullYear()}-${o.createdAt.getMonth()}`);
    if (!m) continue;
    if (o.status === "delivered") m.closed += 1;
    else if (o.status === "processing") m.negotiating += 1;
  }

  const orderStatus = { delivered: 0, processing: 0, pending: 0 };
  const allOrders = await prisma.order.findMany({ where: { userId }, select: { status: true } });
  for (const o of allOrders) {
    if (o.status in orderStatus) orderStatus[o.status as keyof typeof orderStatus] += 1;
  }

  return NextResponse.json({
    vendorCount,
    productCount,
    customerCount,
    orderCount,
    vendorChange: calcChange(vendorCount, prevVendor),
    productChange: calcChange(productCount, prevProduct),
    customerChange: calcChange(customerCount, prevCustomer),
    orderChange: calcChange(orderCount, prevOrder),
    trend: {
      labels: months.map((m) => m.label),
      closed: months.map((m) => m.closed),
      negotiating: months.map((m) => m.negotiating),
    },
    orderStatus,
    recentOrders: JSON.parse(JSON.stringify(recentOrders)),
  });
}