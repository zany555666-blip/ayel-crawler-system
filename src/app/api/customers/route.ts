import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const customers = await prisma.customer.findMany({
    where: { createdBy: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(customers);
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何记录" }, { status: 400 });

  try {
    const result = await prisma.customer.deleteMany({ where: { id: { in: ids }, createdBy: user.id } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: unknown) {
    return NextResponse.json({ error: `批量删除失败：${error instanceof Error ? error.message : "未知错误"}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        country: data.country || null,
        industry: data.industry || null,
        website: data.website || null,
        customerType: data.customerType || "overseas",
        source: data.source || null,
        status: data.status || "lead",
        notes: data.notes || null,
        createdBy: user.id,
      },
    });
    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "创建失败" }, { status: 500 });
  }
}
