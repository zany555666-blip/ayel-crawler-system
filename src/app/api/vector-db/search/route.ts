import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { searchKnowledge } from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { query, limit } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "请输入查询内容" }, { status: 400 });

    const results = await searchKnowledge(String(query).trim(), Math.min(20, Number(limit) || 5), user.id);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "检索失败" }, { status: 500 });
  }
}
