// 本地轻量向量化：特征哈希（feature hashing）+ L2 归一化
// 无需外部 embedding 服务，无需原生编译，向量存进本地 SQLite。

export const DEFAULT_DIM = 256;

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = (text || "").toLowerCase();

  const words = normalized.match(/[a-z0-9]{2,}/g) || [];
  tokens.push(...words);

  const chinese = normalized.replace(/[^\u4e00-\u9fa5]/g, "");
  for (let i = 0; i < chinese.length - 1; i += 1) {
    tokens.push(chinese.slice(i, i + 2));
  }

  return tokens;
}

function hashToken(token: string, dim: number): number {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dim;
}

export function embedText(text: string, dim: number = DEFAULT_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    vec[hashToken(token, dim)] += 1;
  }
  return l2Normalize(vec);
}

function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (const value of vec) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot; // 向量已归一化，点积即余弦相似度
}

export function vectorToJson(vec: number[]): string {
  return JSON.stringify(vec);
}

export function jsonToVector(json: string | null | undefined): number[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === "number")) {
      return parsed;
    }
  } catch {
    // 向量数据损坏时返回空，走关键词兜底。
  }
  return null;
}
