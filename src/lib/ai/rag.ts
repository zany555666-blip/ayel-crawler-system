import { generateText } from "ai";
import { getAiModel } from "./config";
import { prisma } from "../db";
import { embedText, cosineSimilarity, jsonToVector, vectorToJson } from "../vector";

export async function searchKnowledge(query: string, limit: number = 5, userId?: string) {
  const entries = await prisma.knowledgeEntry.findMany({
    where: userId ? { userId } : undefined,
    include: { product: { select: { name: true } } },
  });

  const queryVec = embedText(query);
  const scored = entries.map((r) => {
    const stored = jsonToVector(r.embedding);
    const similarity = stored
      ? cosineSimilarity(queryVec, stored)
      : keywordScore(query, r.title, r.content, r.tags);
    return { r, similarity };
  });

  scored.sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, limit).map(({ r, similarity }) => ({
    id: r.id,
    productId: r.productId,
    title: r.title,
    content: r.content,
    contentType: r.contentType,
    tags: r.tags,
    language: r.language,
    productName: r.product?.name || null,
    similarity: Math.round(similarity * 1000) / 1000,
  }));
}

export async function ragQuery(
  question: string,
  userId: string,
  productId?: string,
  topK: number = 5
): Promise<{ answer: string; sources: KnowledgeSource[] }> {
  let results: Array<{
    id: string;
    title: string;
    content: string;
    productName?: string | null;
    similarity: number;
  }>;

  if (productId) {
    const entries = await prisma.knowledgeEntry.findMany({
      where: { productId, userId },
      include: { product: { select: { name: true } } },
      take: topK,
    });
    const queryVec = embedText(question);
    const scored = entries.map((r) => {
      const stored = jsonToVector(r.embedding);
      const similarity = stored
        ? cosineSimilarity(queryVec, stored)
        : keywordScore(question, r.title, r.content, r.tags);
      return { r, similarity };
    });
    scored.sort((a, b) => b.similarity - a.similarity);
    results = scored.map(({ r, similarity }) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      productName: r.product?.name || null,
      similarity,
    }));
  } else {
    results = await searchKnowledge(question, topK, userId);
  }

  const sources: KnowledgeSource[] = results.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    productName: r.productName || undefined,
    similarity: r.similarity || 0,
  }));

  const context = sources
    .map((r) => `[${r.title}]\n${r.content}`)
    .join("\n\n");

  const { text } = await generateText({
    model: await getAiModel(userId),
    system: `You are an AI assistant for supply chain management. Answer questions helpfully and professionally.
If you don't know something, be honest about it. Provide practical advice when possible.
Answer in the same language as the question.${context ? "\n\nAvailable product knowledge:\n" + context : ""}`,
    prompt: context
      ? `基于以下知识库内容回答问题:\n\n${context}\n\n问题: ${question}\n\n请用专业且简洁的方式回答。`
      : `${question}\n\n请直接回答，用专业且简洁的方式。`,
  });

  return { answer: text, sources };
}

export interface KnowledgeSource {
  id: string;
  title: string;
  content: string;
  productName?: string;
  similarity: number;
}

export async function addKnowledgeEntry(
  userId: string,
  productId: string | null,
  title: string,
  content: string,
  contentType: string = "manual",
  tags?: string,
  language: string = "zh"
) {
  await prisma.knowledgeEntry.create({
    data: {
      userId,
      productId,
      title,
      content,
      contentType,
      tags,
      language,
      embedding: vectorToJson(embedText(`${title}\n${content}\n${tags || ""}`)),
    },
  });
}

export async function indexProductToKnowledge(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  const vendor = product.vendorId ? await prisma.vendor.findUnique({ where: { id: product.vendorId } }) : null;
  if (vendor?.userId && vendor.userId !== userId) return;

  const contentParts: string[] = [];
  if (product.name) contentParts.push(`产品名称: ${product.name}`);
  if (product.nameEn) contentParts.push(`Product Name: ${product.nameEn}`);
  if (product.description) contentParts.push(`产品描述: ${product.description}`);
  if (product.descriptionEn) contentParts.push(`Description: ${product.descriptionEn}`);
  if (product.category) contentParts.push(`分类: ${product.category}`);
  if (product.specifications) contentParts.push(`规格: ${product.specifications}`);

  const fullContent = contentParts.join("\n");

  await prisma.knowledgeEntry.deleteMany({ where: { productId, contentType: "auto_index", userId } });

  await prisma.knowledgeEntry.create({
    data: {
      userId,
      productId,
      title: `产品索引: ${product.name}`,
      content: fullContent,
      contentType: "auto_index",
      tags: product.category || "",
      embedding: vectorToJson(embedText(fullContent)),
    },
  });
}

export async function reindexAllKnowledge(userId: string): Promise<number> {
  const entries = await prisma.knowledgeEntry.findMany({
    where: { userId },
    select: { id: true, title: true, content: true, tags: true },
  });
  for (const entry of entries) {
    await prisma.knowledgeEntry.update({
      where: { id: entry.id },
      data: { embedding: vectorToJson(embedText(`${entry.title}\n${entry.content}\n${entry.tags || ""}`)) },
    });
  }
  return entries.length;
}

function keywordScore(query: string, title: string, content: string, tags?: string | null): number {
  const qTokens = tokenizeForScore(query.toLowerCase());
  if (qTokens.length === 0) return 0;
  const haystack = `${title} ${content} ${tags || ""}`.toLowerCase();
  let hit = 0;
  for (const token of qTokens) {
    if (haystack.includes(token)) hit += 1;
  }
  return hit / qTokens.length;
}

function tokenizeForScore(text: string): string[] {
  const words = text.match(/[a-z0-9]{2,}/g) || [];
  const chinese = text.replace(/[^\u4e00-\u9fa5]/g, "");
  const bigrams: string[] = [];
  for (let i = 0; i < chinese.length - 1; i += 1) bigrams.push(chinese.slice(i, i + 2));
  return [...words, ...bigrams];
}
