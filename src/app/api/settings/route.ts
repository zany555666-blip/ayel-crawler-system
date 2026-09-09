import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { encrypt, decrypt } from "@/lib/crypto";

const DEFAULT = {
  provider: "deepseek",
  apiKey: "",
  baseUrl: "https://api.deepseek.com/v1",
  modelName: "deepseek-chat",
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  let config = await prisma.systemConfig.findUnique({
    where: { userId: user.id },
  });

  if (!config) {
    return NextResponse.json(DEFAULT);
  }

  return NextResponse.json({
    ...config,
    apiKey: config.apiKey ? decrypt(config.apiKey) : "",
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const config = await prisma.systemConfig.upsert({
    where: { userId: user.id },
    update: {
      provider: body.provider,
      apiKey: body.apiKey ? encrypt(body.apiKey) : "",
      baseUrl: body.baseUrl,
      modelName: body.modelName,
    },
    create: {
      userId: user.id,
      provider: body.provider || DEFAULT.provider,
      apiKey: body.apiKey ? encrypt(body.apiKey) : "",
      baseUrl: body.baseUrl || DEFAULT.baseUrl,
      modelName: body.modelName || DEFAULT.modelName,
    },
  });

  return NextResponse.json({
    ...config,
    apiKey: body.apiKey || "",
  });
}
