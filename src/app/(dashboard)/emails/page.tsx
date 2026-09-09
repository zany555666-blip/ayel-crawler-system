import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import EmailsClient from "./EmailsClient";

export default async function EmailsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;

  const emails = await prisma.email.findMany({
    where: { userId: userId || "_none_" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { customer: true },
  });

  return <EmailsClient emails={JSON.parse(JSON.stringify(emails))} />;
}
