import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enrichVendorsList, enrichVendorsListHttp } from "@/lib/crawler";

// 单独官网联系方式补全（分阶段渲染第二阶段）
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const vendors = Array.isArray(body.vendors) ? body.vendors : [];
    if (vendors.length === 0) return NextResponse.json({ vendors: [] });

    const enriched = body.mode === "http"
      ? await enrichVendorsListHttp(vendors)
      : await enrichVendorsList(vendors);
    return NextResponse.json({ vendors: enriched });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "官网补全失败" }, { status: 500 });
  }
}
