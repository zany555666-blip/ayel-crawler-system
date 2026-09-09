import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const oldPassword = String(body.oldPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "请填写旧密码和新密码" }, { status: 400 });
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json({ error: "新密码需至少 8 位且包含字母和数字" }, { status: 400 });
    }
    if (newPassword === oldPassword) {
      return NextResponse.json({ error: "新密码不能与旧密码相同" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.password) {
      return NextResponse.json({ error: "账号无密码，无法修改" }, { status: 400 });
    }

    const valid = await bcrypt.compare(oldPassword, dbUser.password);
    if (!valid) {
      return NextResponse.json({ error: "旧密码不正确" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 12),
        tokenVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "修改密码失败" },
      { status: 500 }
    );
  }
}