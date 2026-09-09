import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { encrypt, decrypt } from "../src/lib/crypto";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const configs = await prisma.systemConfig.findMany({
    select: { userId: true, provider: true, baseUrl: true, modelName: true, apiKey: true },
  });
  console.log("=== SystemConfig ===");
  for (const c of configs) {
    const decrypted = c.apiKey ? decrypt(c.apiKey) : "(empty)";
    const masked = decrypted ? decrypted.slice(0, 8) + "..." : "(empty)";
    console.log(`userId=${c.userId} provider=${c.provider} model=${c.modelName} baseUrl=${c.baseUrl} apiKey=${masked}`);
  }

  // Test encrypt/decrypt
  const testKey = "sk-test-key-12345";
  const enc = encrypt(testKey);
  const dec = decrypt(enc);
  console.log(`\nEncrypt/Decrypt test: ${testKey === dec ? "PASS" : "FAIL"}`);
  if (testKey !== dec) {
    console.log(`Original: ${testKey}`);
    console.log(`Encrypted: ${enc}`);
    console.log(`Decrypted: ${dec}`);
  }

  await prisma.$disconnect();
}

main();
