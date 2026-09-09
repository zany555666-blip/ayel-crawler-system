import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("no admin");

  const existing = await prisma.crawlerConfig.findUnique({ where: { userId: admin.id } });
  if (!existing) {
    await prisma.crawlerConfig.create({
      data: {
        userId: admin.id,
        vendorSources: "[]",
        vendorKeywords: "传感器,控制器,自动化设备",
        vendorPages: 1,
        requestDelayMs: 800,
        crawlMode: "headless",
        headlessBrowsers: "[\"edge\"]",
        crawlInterval: "daily",
        customerSources: "[]",
        customerKeywords: "industrial sensors,automation,controllers",
        targetCountries: "Germany,USA,Mexico,Brazil,Japan,UAE,Korea,India,Vietnam,Australia,UK,France,Canada",
      },
    });
    console.log("crawler config recreated for admin");
  } else {
    console.log("crawler config already exists");
  }

  const orphanSessions = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "CrawlSession" WHERE "userId" IS NULL`);
  const orphanKnowledge = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "KnowledgeEntry" WHERE "userId" IS NULL`);
  const orphanVendors = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT COUNT(*) as n FROM "Vendor" WHERE "userId" IS NULL`);
  console.log("orphans -> sessions:", orphanSessions, "knowledge:", orphanKnowledge, "vendors:", orphanVendors);
  console.log("sessions total:", await prisma.crawlSession.count());
  console.log("knowledge total:", await prisma.knowledgeEntry.count());
  console.log("vendors total:", await prisma.vendor.count());
  console.log("users:", (await prisma.user.findMany({ select: { email: true, role: true, tokenVersion: true } })).map((u) => `${u.email}(${u.role},tv=${u.tokenVersion})`).join(", "));
}

main().finally(() => prisma.$disconnect());