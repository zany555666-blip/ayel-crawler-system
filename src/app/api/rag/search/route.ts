import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ragQuery } from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const { query, productId } = await req.json();
    if (!query) return NextResponse.json({ error: "请输入查询内容" }, { status: 400 });

    const userId = (session.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "用户信息缺失" }, { status: 401 });

    const result = await ragQuery(query, userId, productId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "查询失败" }, { status: 500 });
  }
}
