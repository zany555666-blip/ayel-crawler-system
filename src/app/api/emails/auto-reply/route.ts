import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { runAgent } from "@/lib/ai/agent";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { inquiry, customerEmail, customerId } = await req.json();

    const context = `Customer inquiry: ${inquiry}\nCustomer email: ${customerEmail}`;

    const autoReply = await runAgent({
      task: "auto_reply",
      context,
      userId: user.id,
      params: { creative: false },
    });

    const email = await prisma.email.create({
      data: {
        customerId,
        toAddress: customerEmail,
        fromAddress: user.email || "",
        subject: "Re: Your Inquiry",
        body: autoReply,
        type: "auto_reply",
        aiGenerated: true,
        language: "en",
        status: "draft",
      },
    });

    return NextResponse.json({ reply: autoReply, email });
  } catch (error: any) {
    if (error.message === "NO_API_KEY") {
      return NextResponse.json({ error: "Please configure your AI API Key in settings before using this feature." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
