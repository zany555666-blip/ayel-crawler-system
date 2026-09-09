import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { crawlVendors, crawlVendorsResume } from "@/lib/crawler";
import { ParsedVendor } from "@/lib/crawler/sources";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // 人工验证完成后继续采集
    if (body.resume) {
      const resumeResult = await crawlVendorsResume();
      if (resumeResult.captcha) {
        return NextResponse.json({ needVerify: true, verifyUrl: resumeResult.captcha.url, platform: resumeResult.captcha.platform });
      }
      return NextResponse.json({
        vendors: resumeResult.vendors.slice(0, 10),
        sources: [{ label: resumeResult.sourceLabel, count: resumeResult.totalFound, error: resumeResult.error }],
      });
    }

    // 单独入库某条
    if (body.import && body.vendor) {
      const v = body.vendor;
      const exists = await prisma.vendor.findFirst({ where: { name: v.name, userId: userId } });
      if (exists) return NextResponse.json({ error: "该厂商已存在" }, { status: 400 });

      const vendor = await prisma.vendor.create({
        data: {
          name: v.name,
          contactName: v.contactName || null,
          email: v.email || null,
          phone: v.phone || null,
          address: v.address || null,
          country: v.country || "中国",
          website: v.website || null,
          category: v.category || null,
          rating: v.rating || 3,
          certificates: JSON.stringify(v.certificates || []),
          notes: v.notes || `来源: ${v.source || "未知"}${v.sourceUrl ? `；${v.sourceUrl}` : ""}`,
          status: "active",
          userId: userId,
        },
      });
      return NextResponse.json({ success: true, vendor });
    }

    // 真实爬虫采集
    const { category, keyword } = body;
    const searchKeyword = keyword || category || "传感器";
    const config = await prisma.crawlerConfig.findUnique({ where: { userId: userId } });
    const configuredSources = Array.isArray(body.sources)
      ? body.sources
      : config?.vendorSources ? JSON.parse(config.vendorSources) : [];

    const results = await crawlVendors(searchKeyword, 10, {
      sources: configuredSources,
      pages: Number(body.pages || config?.vendorPages || 1),
      delayMs: Number(body.delayMs || config?.requestDelayMs || 1200),
      mode: body.mode === "headless" || config?.crawlMode === "headless" ? "headless" : "http",
      browsers: Array.isArray(body.browsers)
        ? body.browsers
        : config?.headlessBrowsers ? JSON.parse(config.headlessBrowsers) : undefined,
      userId,
      enrich: body.enrich !== false,
    });

    let allVendors: ParsedVendor[] = [];
    for (const r of results) {
      allVendors = allVendors.concat(r.vendors);
    }

    // 去重
    const seen = new Set<string>();
    allVendors = allVendors.filter((v) => {
      if (seen.has(v.name)) return false;
      seen.add(v.name);
      return true;
    });

    // 预览模式：只返回不保存
    if (body.preview) {
      const captchaResult = results.find((r) => r.captcha);
      if (captchaResult?.captcha) {
        return NextResponse.json({
          needVerify: true,
          verifyUrl: captchaResult.captcha.url,
          platform: captchaResult.captcha.platform,
          browserId: captchaResult.captcha.browserId,
        });
      }
      return NextResponse.json({
        vendors: allVendors.slice(0, 10),
        sources: results.map((r) => ({ label: r.sourceLabel, count: r.totalFound, error: r.error })),
      });
    }

    // 自动入库模式
    const created = [];
    for (const v of allVendors.slice(0, 5)) {
      const exists = await prisma.vendor.findFirst({ where: { name: v.name, userId: userId } });
      if (!exists) {
        const vendor = await prisma.vendor.create({
          data: {
            name: v.name,
            contactName: v.contactName || null,
            email: v.email || null,
            phone: v.phone || null,
            address: v.address || null,
            country: v.country || "中国",
            website: v.website || null,
            category: v.category || category || null,
            rating: v.rating || 3,
            certificates: JSON.stringify(v.certificates || []),
            notes: v.notes || `来源: ${v.source}${v.sourceUrl ? `；${v.sourceUrl}` : ""}`,
            status: "active",
            userId: userId,
          },
        });
        created.push(vendor);
      }
    }

    return NextResponse.json({ success: true, vendors: created, sources: results.map((r) => ({ label: r.sourceLabel, count: r.totalFound })) });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "厂商采集失败" }, { status: 500 });
  }
}
