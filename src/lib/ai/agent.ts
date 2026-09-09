import { generateText, generateObject } from "ai";
import { getAiModel } from "./config";
import { z } from "zod";

export type AgentTask =
  | "customer_discovery"
  | "background_check"
  | "draft_email"
  | "auto_reply"
  | "inquiry_reply"
  | "product_knowledge"
  | "order_analysis"
  | "vendor_evaluation";

export interface AgentInput {
  task: AgentTask;
  context: string;
  userId: string;
  params?: Record<string, unknown>;
}

export async function runAgent({ task, context, userId, params }: AgentInput) {
  const systemPrompt = getSystemPrompt(task);

  const { text } = await generateText({
    model: await getAiModel(userId),
    system: systemPrompt,
    prompt: context,
    temperature: params?.creative ? 0.7 : 0.3,
  });

  return text;
}

function getSystemPrompt(task: AgentTask): string {
  const prompts: Record<AgentTask, string> = {
    customer_discovery: `You are a supply chain business development AI. Search and analyze potential overseas customers.
Analyze industry trends, company profiles, import/export data, and generate a structured report with:
1. Company name and basic info
2. Industry match score (0-100)
3. Purchase potential assessment
4. Recommended contact approach
5. Risk factors and red flags
Respond in JSON format.`,

    background_check: `You are a due diligence AI for international trade. Given a company name and country,
conduct a thorough background check. Analyze:
1. Company registration and legitimacy
2. Financial stability indicators
3. Trade history and reputation
4. Legal risks and sanctions checks
5. Recommended trust score (0-100)
6. Trade compliance flags
Provide structured analysis.`,

    draft_email: `You are a professional international trade copywriter. Draft business development emails.
Requirements:
- Multilingual support (EN, ZH, ES, FR, AR, etc.)
- Professional yet approachable tone
- Include company and product intro
- Clear call to action
- Follow email best practices (no spam triggers)
Output the email with subject line, body, and signature.`,

    auto_reply: `You are an AI assistant for supply chain inquiries. Auto-reply to customer inquiries.
Requirements:
- Respond in the same language as the inquiry
- Be concise but comprehensive
- Include relevant product info from knowledge base
- Ask qualifying questions to assess buyer intent
- Maintain professional tone`,

    inquiry_reply: `You are a sales engineer replying to a B2B buyer's purchase inquiry (e.g. from TradeWheel buy offers).
Reply directly to the buyer's requested products and requirements.
Requirements:
- Respond in the same language as the inquiry
- Reference the buyer's specific product request and details from the inquiry
- Give a ballpark price range and MOQ for each requested item
- Ask 2-3 clarifying questions about quantity, specification and destination
- Offer a catalog or samples
- Professional, concise, no spammy marketing fluff
Output only the email body.`,

    product_knowledge: `You are a product knowledge base AI for supply chain. Answer questions about products.
Use the provided product context to:
- Answer product specifications accurately
- Suggest alternative products when appropriate
- Provide MOQ, lead time, pricing info
- Recommend upselling/cross-selling opportunities`,

    order_analysis: `You are a supply chain analytics AI. Analyze order data to provide insights:
- Demand forecasting
- Inventory optimization suggestions
- Vendor performance analysis
- Cost optimization opportunities
- Risk identification in the supply chain`,

    vendor_evaluation: `You are a vendor evaluation AI. Evaluate vendors based on:
- Quality metrics
- Delivery reliability
- Price competitiveness
- Communication responsiveness
- Compliance and certifications
Generate a comprehensive scorecard with recommendations.`,
  };

  return prompts[task] || prompts.product_knowledge;
}

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  userId: string,
  systemPrompt?: string
): Promise<T> {
  const { object } = await generateObject({
    model: await getAiModel(userId),
    schema,
    prompt,
    system: systemPrompt,
  });

  return object;
}

export async function analyzeCustomerIntent(inquiry: string, userId: string) {
  return generateStructuredOutput(
    inquiry,
    z.object({
      intent: z.enum(["price_inquiry", "product_info", "order_status", "partnership", "complaint", "other"]),
      urgency: z.enum(["low", "medium", "high"]),
      language: z.string(),
      suggestedProducts: z.array(z.string()),
      recommendedAction: z.string(),
      confidence: z.number().min(0).max(1),
    }),
    userId
  );
}
