import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { ragQuery } from "@/lib/ai/rag";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { message, history } = await req.json();

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "user",
        content: message,
        sessionId: "default",
      },
    });

    const result = await ragQuery(message, user.id, undefined, 5);

    await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: "assistant",
        content: result.answer,
        sessionId: "default",
      },
    });

    return NextResponse.json({ reply: result.answer, sources: result.sources });
  } catch (error: any) {
    if (error.message === "NO_API_KEY") {
      return NextResponse.json({
        reply: "未配置 AI API Key。请在【系统配置】中设置 API Key 后使用 AI 功能。\n\nNo AI API Key configured. Please set up your API Key in [System Settings] to enable AI features.",
        sources: [],
        noApiKey: true,
      });
    }
    return NextResponse.json({
      reply: `AI 调用失败: ${error.message}`,
      sources: [],
    });
  }
}
