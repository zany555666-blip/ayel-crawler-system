import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return <DashboardClient
      userName=""
      vendorCount={0}
      productCount={0}
      customerCount={0}
      orderCount={0}
      recentOrders={[]}
      ordersGrouped={[]}
      orderStatusData={[]}
      vendorChange="0"
      productChange="0"
      customerChange="0"
      orderChange="0"
    />;
  }

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

  const recentOrders = await prisma.order.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { vendor: { select: { name: true } } },
  });

  return (
    <DashboardClient
      userName={session?.user?.name || ""}
      vendorCount={vendorCount}
      productCount={productCount}
      customerCount={customerCount}
      orderCount={orderCount}
      recentOrders={JSON.parse(JSON.stringify(recentOrders))}
      ordersGrouped={[]}
      orderStatusData={[]}
      vendorChange={calcChange(vendorCount, prevVendor)}
      productChange={calcChange(productCount, prevProduct)}
      customerChange={calcChange(customerCount, prevCustomer)}
      orderChange={calcChange(orderCount, prevOrder)}
    />
  );
}
