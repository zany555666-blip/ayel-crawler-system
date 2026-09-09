import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

// 订单批量删除
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const where = user.role === "admin"
      ? { id: { in: ids } }
      : { id: { in: ids }, userId: user.id };
    const result = await prisma.order.deleteMany({ where });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: `批量删除失败：${error instanceof Error ? error.message : "未知错误"}` }, { status: 500 });
  }
}