import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enrichCustomerLeadsHttp } from "@/lib/crawler/customers";

// 客户线索第二阶段：官网定位 + 联系方式补全 + 买家质量评分
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];
    if (leads.length === 0) return NextResponse.json({ leads: [] });

    const enriched = await enrichCustomerLeadsHttp(leads);
    return NextResponse.json({ leads: enriched });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "客户补全失败" }, { status: 500 });
  }
}