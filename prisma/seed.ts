import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("Admin123", 12);

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@supplyai.com" },
    update: {},
    create: {
      name: "管理员",
      email: "admin@supplyai.com",
      password: hashedPassword,
      role: "admin",
      company: "SupplyAI",
    },
  });
  console.log("Admin:", adminUser.email);

  // Admin's vendor profile
  const adminVendor = await prisma.vendor.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      name: "SupplyAI 总部",
      contactName: "管理员",
      email: "admin@supplyai.com",
      phone: "+86-138-0000-0000",
      address: "浙江省嘉兴市海盐县",
      country: "中国",
      category: "finished_goods",
      status: "active",
      rating: 5,
      userId: adminUser.id,
    },
  });

  // Vendor user 1
  const vendorUser1 = await prisma.user.upsert({
    where: { email: "vendor@supplyai.com" },
    update: {},
    create: {
      name: "张伟",
      email: "vendor@supplyai.com",
      password: hashedPassword,
      role: "vendor",
      company: "良友科技有限公司",
    },
  });

  const vendor1 = await prisma.vendor.upsert({
    where: { userId: vendorUser1.id },
    update: {},
    create: {
      name: "良友科技有限公司",
      contactName: "张伟",
      email: "vendor@supplyai.com",
      phone: "+86-138-0000-0001",
      address: "广东省深圳市宝安区",
      country: "中国",
      website: "https://www.liangyou-tech.cn",
      category: "finished_goods",
      status: "active",
      rating: 5,
      certificates: JSON.stringify(["ISO9001", "CE", "RoHS"]),
      userId: vendorUser1.id,
    },
  });
  console.log("Vendor 1:", vendor1.name);

  // Vendor user 2
  const vendorUser2 = await prisma.user.upsert({
    where: { email: "vendor2@supplyai.com" },
    update: {},
    create: {
      name: "李明",
      email: "vendor2@supplyai.com",
      password: hashedPassword,
      role: "vendor",
      company: "明达电子有限公司",
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { userId: vendorUser2.id },
    update: {},
    create: {
      name: "明达电子有限公司",
      contactName: "李明",
      email: "vendor2@supplyai.com",
      phone: "+86-139-0000-0002",
      address: "江苏省苏州市工业园区",
      country: "中国",
      category: "components",
      status: "active",
      rating: 4,
      userId: vendorUser2.id,
    },
  });
  console.log("Vendor 2:", vendor2.name);

  // Products for vendor 1
  const products1 = [
    { name: "智能传感器模块 LY-200", nameEn: "Smart Sensor Module LY-200", sku: "LY-SS-200", category: "传感器", description: "高精度智能传感器模块，适用于工业自动化", descriptionEn: "High-precision smart sensor module", price: 89.99 },
    { name: "工业控制器 LY-500", nameEn: "Industrial Controller LY-500", sku: "LY-IC-500", category: "控制器", description: "多功能工业控制器，支持Modbus/TCP协议", descriptionEn: "Multi-function industrial controller", price: 299 },
    { name: "温湿度变送器 LY-TH100", nameEn: "Temperature & Humidity Transmitter LY-TH100", sku: "LY-TH-100", category: "传感器", description: "工业级温湿度变送器，精度±0.3°C", descriptionEn: "Industrial grade humidity transmitter", price: 49.99 },
  ];

  for (const p of products1) {
    const product = await prisma.product.create({
      data: {
        ...p,
        vendorId: vendor1.id,
        specifications: JSON.stringify({ weight: "200g", dimensions: "50x30x20mm", powerSupply: "5V DC" }),
        certifications: JSON.stringify(["CE", "RoHS"]),
      },
    });
    console.log("Product:", product.name);
  }

  // Products for vendor 2
  const products2 = [
    { name: "精密电阻器 MD-R100", nameEn: "Precision Resistor MD-R100", sku: "MD-R-100", category: "零部件", description: "高精度薄膜电阻器，0.1%公差", descriptionEn: "High precision thin-film resistor", price: 2.5 },
    { name: "电容器模组 MD-C200", nameEn: "Capacitor Module MD-C200", sku: "MD-C-200", category: "零部件", description: "铝电解电容器模组，耐高温", descriptionEn: "Aluminum electrolytic capacitor module", price: 15 },
  ];

  for (const p of products2) {
    const product = await prisma.product.create({
      data: {
        ...p,
        vendorId: vendor2.id,
        specifications: JSON.stringify({ weight: "50g", voltage: "400V" }),
        certifications: JSON.stringify(["CE", "RoHS"]),
      },
    });
    console.log("Product:", product.name);
  }

  // Customers for admin
  const adminCustomers = [
    { name: "TechTrade GmbH", company: "TechTrade GmbH", contactName: "Hans Mueller", email: "hans.mueller@techtrade.de", country: "Germany", industry: "Industrial Automation", source: "exhibition", status: "negotiation", createdBy: adminUser.id },
    { name: "GlobalSourcing Inc", company: "GlobalSourcing Inc", contactName: "John Smith", email: "john@globalsourcing.com", country: "USA", industry: "Electronics", source: "linkedin", status: "qualified", createdBy: adminUser.id },
  ];

  for (const c of adminCustomers) {
    await prisma.customer.create({ data: c });
    console.log("Customer:", c.name);
  }

  // Customers for vendor 1
  const vendor1Customers = [
    { name: "Summit Imports Ltd", company: "Summit Imports Ltd", contactName: "Carlos Ruiz", email: "carlos@summitimports.mx", country: "Mexico", industry: "Manufacturing", source: "referral", status: "lead", createdBy: vendorUser1.id },
  ];

  for (const c of vendor1Customers) {
    await prisma.customer.create({ data: c });
    console.log("Customer:", c.name);
  }

  // Orders for vendor 1
  const orders = [
    { orderNumber: "ORD-2026-001", vendorId: vendor1.id, userId: vendorUser1.id, status: "delivered", totalAmount: 8999, currency: "CNY" },
    { orderNumber: "ORD-2026-002", vendorId: vendor1.id, userId: vendorUser1.id, status: "processing", totalAmount: 12500, currency: "CNY" },
    { orderNumber: "ORD-2026-003", vendorId: vendor2.id, userId: vendorUser2.id, status: "pending", totalAmount: 3500, currency: "CNY" },
  ];

  for (const o of orders) {
    await prisma.order.create({ data: o });
    console.log("Order:", o.orderNumber);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
