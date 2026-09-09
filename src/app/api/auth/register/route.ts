import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码是必填项" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少需要8位字符" }, { status: 400 });
    }

    if (!/[a-zA-Z]/.test(password)) {
      return NextResponse.json({ error: "密码需要包含至少一个字母" }, { status: 400 });
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "密码需要包含至少一个数字" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email: normalizedEmail,
        password: hashedPassword,
        company: company || null,
        role: "vendor",
      },
    });

    if (company) {
      await prisma.vendor.create({
        data: {
          name: company,
          contactName: name || null,
          email: normalizedEmail,
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
