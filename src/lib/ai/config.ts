import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "../db";
import { decrypt } from "../crypto";

async function getConfig(userId: string) {
  let cfg;
  try {
    cfg = await prisma.systemConfig.findUnique({ where: { userId } });
  } catch (e: any) {
    throw new Error(`数据库查询失败: ${e.message}`);
  }

  if (cfg?.apiKey) {
    const decrypted = decrypt(cfg.apiKey);
    if (decrypted) {
      return {
        apiKey: decrypted,
        baseURL: cfg.baseUrl || "https://api.deepseek.com/v1",
        model: cfg.modelName || "deepseek-chat",
      };
    }
    throw new Error("API Key 解密失败，请重新在【系统配置】中设置");
  }

  const envKey = process.env.OPENAI_API_KEY || "";
  if (envKey && envKey !== "sk-your-openai-api-key") {
    return {
      apiKey: envKey,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      model: process.env.OPENAI_MODEL || "deepseek-chat",
    };
  }

  throw new Error("NO_API_KEY");
}

export async function getAiModel(userId: string) {
  const cfg = await getConfig(userId);
  const openai = createOpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  return openai(cfg.model);
}

export async function getEmbeddingModel(userId: string) {
  const cfg = await getConfig(userId);
  const openai = createOpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  return openai.embedding("text-embedding-3-small");
}
