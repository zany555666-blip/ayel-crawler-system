import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeCustomerDemand } from "@/lib/ai/customerDemand";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "缺少线索名称" }, { status: 400 });

    const demand = await analyzeCustomerDemand(
      {
        name,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        country: typeof body.country === "string" ? body.country : undefined,
        source: typeof body.source === "string" ? body.source : undefined,
        quantity: typeof body.quantity === "string" ? body.quantity : undefined,
      },
      userId
    );

    return NextResponse.json({ demand });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `需求分析失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}