import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const sessions = await prisma.crawlSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json(
    sessions.map((session) => ({
      id: session.id,
      keyword: session.keyword,
      target: session.target,
      createdAt: session.createdAt,
      results: JSON.parse(session.results || "[]"),
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const keyword = String(body.keyword || "");
    const target = body.target === "buyer" ? "buyer" : "supplier";
    const results = Array.isArray(body.results) ? body.results : [];
    const session = await prisma.crawlSession.create({
      data: {
        userId: user.id,
        keyword,
        target,
        results: JSON.stringify(results),
      },
    });
    return NextResponse.json({ id: session.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "会话保存失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const result = await prisma.crawlSession.deleteMany({ where: { id: { in: ids }, userId: user.id } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: `批量删除失败：${error instanceof Error ? error.message : "未知错误"}` }, { status: 500 });
  }
}
