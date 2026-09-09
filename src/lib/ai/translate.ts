import { generateText } from "ai";
import { getAiModel } from "./config";

// 中文关键词自动翻译为英文（用于海外客户采集的国际检索、前端手动翻译）。
// 翻译失败或非中文输入时返回 null，不阻断调用方流程。
export async function translateToEnglish(keyword: string, userId?: string): Promise<string | null> {
  if (!/[\u4e00-\u9fa5]/.test(keyword)) return null;
  if (!userId) return null;
  try {
    const { text } = await generateText({
      model: await getAiModel(userId),
      prompt: `Translate the following sourcing/buyer keyword from Chinese into concise English industry terms used in international trade. Output ONLY the English translation (a word or short phrase), no quotes, no punctuation, no explanation.\n\nChinese keyword: ${keyword}`,
    });
    const result = text.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, " ").trim();
    if (!result || !/[a-zA-Z]/.test(result)) return null;
    return result;
  } catch {
    return null;
  }
}