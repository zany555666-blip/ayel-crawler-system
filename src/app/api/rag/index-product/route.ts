import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { indexProductToKnowledge } from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: "缺少产品ID" }, { status: 400 });

    await indexProductToKnowledge(user.id, productId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "索引失败" }, { status: 500 });
  }
}