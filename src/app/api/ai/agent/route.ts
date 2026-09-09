import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { runAgent } from "@/lib/ai/agent";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { task, context, params } = await req.json();

    const userContext = `[User ID: ${user.id}, Role: ${user.role}]\n${context || ""}`;
    const result = await runAgent({ task, context: userContext, userId: user.id, params });
    return NextResponse.json({ result });
  } catch (error: any) {
    if (error.message === "NO_API_KEY") {
      return NextResponse.json({
        result: "未配置 AI API Key。请在【系统配置】中设置 API Key。",
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
