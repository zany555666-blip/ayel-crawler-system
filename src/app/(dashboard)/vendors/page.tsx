import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import VendorsClient from "./VendorsClient";

export default async function VendorsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const vendors = await prisma.vendor.findMany({
    where: userId ? { OR: [{ userId }, { userId: null }] } : { userId: null },
    include: { _count: { select: { products: true, orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <VendorsClient vendors={JSON.parse(JSON.stringify(vendors))} />;
}
