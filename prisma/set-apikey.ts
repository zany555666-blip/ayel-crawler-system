import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { encrypt, decrypt } from "../src/lib/crypto";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const testKey = process.argv[2];
  if (!testKey) {
    console.log("Usage: npx tsx prisma/set-apikey.ts YOUR_API_KEY");
    await prisma.$disconnect();
    return;
  }

  const user = await prisma.user.findFirst({ where: { email: "admin@supplyai.com" } });
  if (!user) { console.log("Admin not found"); await prisma.$disconnect(); return; }

  const enc = encrypt(testKey);
  const dec = decrypt(enc);
  if (testKey !== dec) {
    console.log("ERROR: Encrypt/decrypt roundtrip failed!");
    await prisma.$disconnect();
    return;
  }

  await prisma.systemConfig.upsert({
    where: { userId: user.id },
    update: {
      provider: "deepseek",
      apiKey: enc,
      baseUrl: "https://api.deepseek.com/v1",
      modelName: "deepseek-chat",
    },
    create: {
      userId: user.id,
      provider: "deepseek",
      apiKey: enc,
      baseUrl: "https://api.deepseek.com/v1",
      modelName: "deepseek-chat",
    },
  });

  console.log("API Key saved successfully!");

  // Verify
  const cfg = await prisma.systemConfig.findUnique({ where: { userId: user.id } });
  if (cfg) {
    const decrypted = decrypt(cfg.apiKey);
    console.log(`Verify: ${decrypted ? decrypted.slice(0, 10) + "..." : "FAILED"}`);
  }

  // Also set for both vendors
  const vendors = await prisma.user.findMany({
    where: { email: { in: ["vendor@supplyai.com", "vendor2@supplyai.com"] } },
  });
  for (const v of vendors) {
    await prisma.systemConfig.upsert({
      where: { userId: v.id },
      update: {
        provider: "deepseek",
        apiKey: enc,
        baseUrl: "https://api.deepseek.com/v1",
        modelName: "deepseek-chat",
      },
      create: {
        userId: v.id,
        provider: "deepseek",
        apiKey: enc,
        baseUrl: "https://api.deepseek.com/v1",
        modelName: "deepseek-chat",
      },
    });
    console.log(`Set for: ${v.email}`);
  }

  await prisma.$disconnect();
}

main();
