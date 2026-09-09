import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { embedText, vectorToJson } from "@/lib/vector";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const entries = await prisma.knowledgeEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { product: { select: { name: true } } },
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      contentType: e.contentType,
      tags: e.tags,
      language: e.language,
      productId: e.productId,
      productName: e.product?.name || null,
      createdAt: e.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    if (!title || !content) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const language = ["zh", "en", "bilingual"].includes(body.language) ? body.language : "zh";
    const tags = body.tags ? String(body.tags).trim() : null;

    let productId: string | null = null;
    if (body.productId) {
      const product = await prisma.product.findUnique({ where: { id: String(body.productId) } });
      if (!product) return NextResponse.json({ error: "关联产品不存在" }, { status: 400 });
      const vendor = product.vendorId
        ? await prisma.vendor.findUnique({ where: { id: product.vendorId } })
        : null;
      if (vendor && vendor.userId && vendor.userId !== user.id) {
        return NextResponse.json({ error: "无权关联该产品" }, { status: 403 });
      }
      productId = product.id;
    }

    const entry = await prisma.knowledgeEntry.create({
      data: {
        userId: user.id,
        productId,
        title,
        content,
        contentType: "manual",
        tags,
        language,
        embedding: vectorToJson(embedText(`${title}\n${content}\n${tags || ""}`)),
      },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `写入失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "缺少条目 ID" }, { status: 400 });

    const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "条目不存在" }, { status: 404 });
    }

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const content = body.content !== undefined ? String(body.content).trim() : existing.content;
    if (!title || !content) return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });

    const language = body.language !== undefined && ["zh", "en", "bilingual"].includes(body.language) ? body.language : existing.language;
    const tags = body.tags !== undefined ? String(body.tags).trim() : existing.tags;

    let productId = existing.productId;
    if (body.productId !== undefined) {
      productId = body.productId ? String(body.productId) : null;
      if (productId) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return NextResponse.json({ error: "关联产品不存在" }, { status: 400 });
        const vendor = product.vendorId
          ? await prisma.vendor.findUnique({ where: { id: product.vendorId } })
          : null;
        if (vendor && vendor.userId && vendor.userId !== user.id) {
          return NextResponse.json({ error: "无权关联该产品" }, { status: 403 });
        }
      }
    }

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        title,
        content,
        tags,
        language,
        productId,
        embedding: vectorToJson(embedText(`${title}\n${content}\n${tags || ""}`)),
      },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `更新失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  if (ids.length === 0) return NextResponse.json({ error: "未选择任何条目" }, { status: 400 });

  const result = await prisma.knowledgeEntry.deleteMany({ where: { id: { in: ids }, userId: user.id } });
  return NextResponse.json({ success: true, deleted: result.count });
}