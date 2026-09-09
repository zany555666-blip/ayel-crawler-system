import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

// 更新会话中某厂商的入库状态
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const session = await prisma.crawlSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

    const body = await req.json();
    const results = JSON.parse(session.results || "[]");
    const vendorName = String(body.vendorName || "");
    const next = results.map((item: { name?: string }) =>
      item.name === vendorName ? { ...item, stored: true } : item
    );

    const updated = await prisma.crawlSession.update({
      where: { id },
      data: { results: JSON.stringify(next) },
    });
    return NextResponse.json({ id: updated.id, results: JSON.parse(updated.results || "[]") });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 });
  }
}
