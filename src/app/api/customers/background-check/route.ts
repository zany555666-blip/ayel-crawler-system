import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { runBackgroundCheck } from "@/lib/ai/backgroundCheck";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "缺少公司名称" }, { status: 400 });

    const result = await runBackgroundCheck(
      {
        name,
        country: typeof body.country === "string" ? body.country : undefined,
        industry: typeof body.industry === "string" ? body.industry : undefined,
        website: typeof body.website === "string" ? body.website : undefined,
        lang: body.lang === "en" ? "en" : "zh",
      },
      user.id
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === "NO_API_KEY") {
      return NextResponse.json({ error: "请在设置页配置 AI API Key 后使用此功能" }, { status: 400 });
    }
    return NextResponse.json({ error: `背调失败：${error.message || "未知错误"}` }, { status: 500 });
  }
}