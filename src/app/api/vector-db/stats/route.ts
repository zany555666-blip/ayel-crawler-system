import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const myVendor = await prisma.vendor.findUnique({ where: { userId: user.id } });
    const vendorFilter = myVendor ? { vendorId: myVendor.id } : {};
    const [vendors, products, customers, orders, emails, knowledge, vectorized, campaigns, chatMessages] =
      await Promise.all([
        prisma.vendor.count({ where: { userId: user.id } }),
        prisma.product.count({ where: vendorFilter }),
        prisma.customer.count({ where: { createdBy: user.id } }),
        prisma.order.count({ where: { userId: user.id } }),
        prisma.email.count({ where: { userId: user.id } }),
        prisma.knowledgeEntry.count({ where: { userId: user.id } }),
        prisma.knowledgeEntry.count({ where: { userId: user.id, embedding: { not: null } } }),
        prisma.campaign.count({ where: { userId: user.id } }),
        prisma.chatMessage.count({ where: { userId: user.id } }),
      ]);

    let sizeBytes = 0;
    try {
      const stat = await fs.stat(path.join(process.cwd(), "prisma", "dev.db"));
      sizeBytes = stat.size;
    } catch {
      sizeBytes = 0;
    }

    const tables = [
      { name: "Vendor", label: "厂商", rows: vendors },
      { name: "Product", label: "产品", rows: products },
      { name: "Customer", label: "客户", rows: customers },
      { name: "Order", label: "订单", rows: orders },
      { name: "Email", label: "邮件", rows: emails },
      { name: "KnowledgeEntry", label: "知识条目", rows: knowledge },
      { name: "Campaign", label: "营销活动", rows: campaigns },
      { name: "ChatMessage", label: "AI 对话", rows: chatMessages },
    ];

    return NextResponse.json({
      database: {
        file: "prisma/dev.db",
        engine: "SQLite (libsql)",
        sizeBytes,
        tables,
        totalRows: tables.reduce((sum, table) => sum + table.rows, 0),
      },
      vector: {
        dim: 256,
        total: knowledge,
        vectorized,
        coverage: knowledge ? Math.round((vectorized / knowledge) * 100) : 0,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "统计失败" }, { status: 500 });
  }
}
