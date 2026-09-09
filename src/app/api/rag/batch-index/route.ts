import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { indexProductToKnowledge, reindexAllKnowledge } from "@/lib/ai/rag";
import { prisma } from "@/lib/db";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const myVendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    const products = await prisma.product.findMany({
      where: { isActive: true, ...(myVendor ? { vendorId: myVendor.id } : {}) },
      select: { id: true },
    });

    let count = 0;
    for (const p of products) {
      await indexProductToKnowledge(user.id, p.id);
      count++;
    }

    const reindexed = await reindexAllKnowledge(user.id);

    return NextResponse.json({ success: true, count, reindexed });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "索引失败" }, { status: 500 });
  }
}