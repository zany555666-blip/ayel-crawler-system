import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import OrdersClient from "./OrdersClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const sp = await searchParams;
  const q = sp.q || "";
  const status = sp.status || "";

  const where: any = { userId: userId || "_none_" };
  if (q) where.orderNumber = { contains: q };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <OrdersClient orders={JSON.parse(JSON.stringify(orders))} />;
}
