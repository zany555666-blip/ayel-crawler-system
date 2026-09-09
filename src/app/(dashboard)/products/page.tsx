import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const vendor = userId
    ? await prisma.vendor.findUnique({ where: { userId } })
    : null;

  const products = await prisma.product.findMany({
    where: vendor ? { vendorId: vendor.id } : { id: "_none_" },
    include: { vendor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <ProductsClient products={JSON.parse(JSON.stringify(products))} />;
}
