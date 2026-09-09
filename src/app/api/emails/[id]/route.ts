import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email/mailer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const { action, toAddress, subject, body: emailBody, language } = body;

  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (email.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (action === "send") {
    const result = await sendEmail(
      toAddress || email.toAddress,
      subject || email.subject,
      emailBody || email.body
    );

    if (result.success) {
      await prisma.email.update({
        where: { id },
        data: {
          status: "sent",
          sentAt: new Date(),
          toAddress: toAddress || email.toAddress,
          subject: subject || email.subject,
          body: emailBody || email.body,
          language: language || email.language,
        },
      });
      return NextResponse.json({ success: true, messageId: result.messageId });
    }

    await prisma.email.update({
      where: { id },
      data: { status: "failed" },
    });
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const updated = await prisma.email.update({
    where: { id },
    data: {
      toAddress: toAddress ?? email.toAddress,
      subject: subject ?? email.subject,
      body: emailBody ?? email.body,
      language: language ?? email.language,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const email = await prisma.email.findUnique({ where: { id } });
  if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (email.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.email.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
