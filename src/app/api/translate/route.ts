import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateToEnglish } from "@/lib/ai/translate";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text) return NextResponse.json({ error: "请输入要翻译的内容" }, { status: 400 });

    const translated = await translateToEnglish(text, userId);
    if (!translated) {
      return NextResponse.json({ error: "翻译失败：请检查 AI 模型配置，或输入需为中文" }, { status: 422 });
    }

    return NextResponse.json({ translated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: `翻译失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}