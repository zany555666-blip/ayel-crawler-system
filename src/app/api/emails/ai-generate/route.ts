import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { runAgent } from "@/lib/ai/agent";
import { generateBusinessEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const { customerId, language, productIds, customContext } = await req.json();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json({ error: "客户不存在" }, { status: 404 });
    }

    let productInfo = "";
    if (productIds?.length) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      productInfo = products.map((p) => `${p.name} (${p.sku})`).join(", ");
    } else {
      productInfo = "high-quality industrial products";
    }

    const context = `Generate a business development email for:
Company: ${customer.company || customer.name}
Contact: ${customer.contactName || "Decision Maker"}
Country: ${customer.country || "International"}
Industry: ${customer.industry || "General"}
Products: ${productInfo}
Additional Context: ${customContext || ""}
Language: ${language || "en"}`;

    const aiResult = await runAgent({
      task: "draft_email",
      context,
      userId: user.id,
      params: { creative: true },
    });

    const email = await prisma.email.create({
      data: {
        customerId,
        toAddress: customer.email || "",
        fromAddress: user.email || "",
        subject: `AI Generated: ${language || "EN"} Development Letter`,
        body: aiResult,
        language: language || "en",
        aiGenerated: true,
        type: "outbound",
      },
    });

    return NextResponse.json({ email, aiResult });
  } catch (error: any) {
    if (error.message === "NO_API_KEY") {
      return NextResponse.json({ error: "Please configure your AI API Key in settings before using this feature." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
