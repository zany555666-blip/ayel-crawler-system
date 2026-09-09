import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) {
    console.error("no admin user found");
    process.exit(1);
  }
  console.log("admin:", admin.email, admin.id);

  const oldConfig = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT * FROM "CrawlerConfig" LIMIT 1`);
  const cfg = oldConfig[0] || null;

  const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("CrawlSession")`);
  if (!cols.some((c) => c.name === "userId")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CrawlSession" ADD COLUMN "userId" TEXT`);
  }
  const cols2 = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("KnowledgeEntry")`);
  if (!cols2.some((c) => c.name === "userId")) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "KnowledgeEntry" ADD COLUMN "userId" TEXT`);
  }

  await prisma.$executeRawUnsafe(`UPDATE "CrawlSession" SET "userId" = ? WHERE "userId" IS NULL`, admin.id);
  await prisma.$executeRawUnsafe(`UPDATE "KnowledgeEntry" SET "userId" = ? WHERE "userId" IS NULL`, admin.id);
  await prisma.$executeRawUnsafe(`UPDATE "Vendor" SET "userId" = ? WHERE "userId" IS NULL`, admin.id);

  const crawlCount = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "CrawlSession"`);
  const knowCount = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "KnowledgeEntry"`);
  const vendorCount = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "Vendor"`);
  console.log("sessions:", crawlCount[0].n, "knowledge:", knowCount[0].n, "vendors:", vendorCount[0].n);

  await prisma.$executeRawUnsafe(`DELETE FROM "CrawlerConfig"`);
  console.log("old crawler config removed (will be recreated after push):", cfg ? JSON.stringify(cfg) : "none");
}

main().finally(() => prisma.$disconnect());