import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { StatCard, SimpleBarChart, SimplePieChart } from "@/components/dashboard/Charts";
import { TrendingUp, DollarSign, Clock, Package } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">数据看板 / Analytics</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">供应链关键指标分析 / Supply chain key metrics analysis</p>
        </div>
      </div>
    );
  }

  const [totalRevenue, avgOrderValue, totalOrders, avgLeadTime] = await Promise.all([
    prisma.order.aggregate({ where: { userId }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { userId }, _avg: { totalAmount: true } }),
    prisma.order.count({ where: { userId } }),
    prisma.product.aggregate({ _avg: { leadTime: true } }),
  ]);

  const orders = await prisma.order.findMany({
    where: { userId },
    select: { status: true },
  });
  const statusCount: Record<string, number> = {};
  for (const o of orders) statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  const ordersByStatus = Object.entries(statusCount).map(([status, count]) => ({ name: status, value: count }));

  const vendors = await prisma.vendor.findMany({
    where: { userId },
    select: { name: true, orders: { where: { userId }, select: { totalAmount: true } } },
  });
  const topVendors = vendors
    .map((v) => ({ name: v.name, value: Number(v.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">数据看板 / Analytics</h1>
        <p className="text-[15px] text-[var(--muted)] mt-0.5">供应链关键指标分析 / Supply chain key metrics analysis</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总营收" value={`¥${Number(totalRevenue._sum.totalAmount || 0).toLocaleString()}`} change="+12.5%" icon={<DollarSign className="w-6 h-6" />} />
        <StatCard title="平均订单额" value={`¥${Number(avgOrderValue._avg.totalAmount || 0).toLocaleString()}`} change="+5.2%" icon={<TrendingUp className="w-6 h-6" />} />
        <StatCard title="总订单数" value={totalOrders} change="+18%" icon={<Package className="w-6 h-6" />} />
        <StatCard title="平均交期" value={`${Math.round(avgLeadTime._avg.leadTime || 0)} 天`} change="-2.1天" icon={<Clock className="w-6 h-6" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">订单状态分布</h3>
          <SimplePieChart data={ordersByStatus} />
        </div>
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">厂商营收 Top 5</h3>
          <SimpleBarChart data={topVendors} />
        </div>
      </div>
    </div>
  );
}
