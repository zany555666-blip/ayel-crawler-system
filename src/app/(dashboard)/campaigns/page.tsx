import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import CampaignsClient from "./CampaignsClient";

export default async function CampaignsPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const campaigns = await prisma.campaign.findMany({
    where: { userId: userId || "_none_" },
    orderBy: { createdAt: "desc" },
  });
  return <CampaignsClient campaigns={JSON.parse(JSON.stringify(campaigns))} />;
}
