import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CustomersClient from "./CustomersClient";

export default async function CustomersPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const customers = await prisma.customer.findMany({
    where: { createdBy: userId || "_none_" },
    orderBy: { lastContactAt: { sort: "desc", nulls: "last" } },
    include: { _count: { select: { emails: true } } },
  });

  return <CustomersClient customers={JSON.parse(JSON.stringify(customers))} />;
}