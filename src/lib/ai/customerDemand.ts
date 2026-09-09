import { generateText } from "ai";
import { getAiModel } from "./config";

export interface DemandAnalysis {
  product: string;
  specs: string;
  market: string;
  intent: string;
  suggestion: string;
  fitScore?: number;
  intentScore?: number;
  potentialScore?: number;
}

const clampScore = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
};

// 分析海外买家线索的采购需求：解析线索标题/备注，输出结构化需求
export async function analyzeCustomerDemand(
  lead: { name: string; notes?: string; country?: string; source?: string; quantity?: string },
  userId: string
): Promise<DemandAnalysis | null> {
  try {
    const { text } = await generateText({
      model: await getAiModel(userId),
      prompt: `你是外贸供应链专家，服务于印刷品辅料（吊牌、织唛、彩卡、彩盒等）供应商。分析下面的海外买家线索，提取其采购需求并评估匹配度。\n\n线索名称：${lead.name}\n备注：${lead.notes || ""}\n需求数量：${lead.quantity || "未说明"}\n国家：${lead.country || "未知"}\n来源：${lead.source || ""}\n\n请严格输出 JSON（不要输出任何其他文字），格式：\n{"product":"买家需要的产品（如：服装吊牌/织唛/彩盒，若不明确则写行业推测）","specs":"数量、材质、规格等具体要求（无则写'未说明'）","market":"目标市场/国家","intent":"采购意图（直接求购/询价RFQ/长期供应/信息不明确）","suggestion":"给供应商的一句话跟进建议（怎么切入、强调什么）","fitScore":"产品契合度0-100：买家需求是否属于印刷辅料可供应范围，无关行业打分低","intentScore":"采购意向强度0-100：需求明确度与数量级，明确求购且数量达MOQ打分高","potentialScore":"规模与复购潜力0-100：买家类型（品牌商/包装厂/贸易商）与市场前景，复购可能性大打分高"}`,
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const clean = (value: unknown): string => String(value || "").replace(/\s+/g, " ").trim();
    return {
      product: clean(parsed.product),
      specs: clean(parsed.specs),
      market: clean(parsed.market),
      intent: clean(parsed.intent),
      suggestion: clean(parsed.suggestion),
      fitScore: clampScore(parsed.fitScore),
      intentScore: clampScore(parsed.intentScore),
      potentialScore: clampScore(parsed.potentialScore),
    };
  } catch {
    return null;
  }
}