import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id as string,
    email: session.user.email || "",
    role: (session.user as any).role as string,
  };
}

export async function getAuthVendorId() {
  const user = await getAuthUser();
  if (!user) return null;

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  return vendor?.id || null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
