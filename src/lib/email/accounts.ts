import "server-only";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export interface SmtpAccountConfig {
  id?: string;
  host: string;
  port: number;
  user: string;
  pass: string;
  email: string;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function resetDailyCountersIfNeeded(userId: string): Promise<void> {
  const accounts = await prisma.emailAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true, lastResetDate: true },
  });
  for (const a of accounts) {
    if (!isToday(a.lastResetDate)) {
      await prisma.emailAccount.update({
        where: { id: a.id },
        data: { sentToday: 0, lastResetDate: new Date() },
      });
    }
  }
}

export async function getAvailableSmtpAccount(
  userId: string
): Promise<SmtpAccountConfig | null> {
  await resetDailyCountersIfNeeded(userId);
  const accounts = await prisma.emailAccount.findMany({
    where: { userId, isActive: true, sentToday: { lt: prisma.emailAccount.fields.dailyLimit } },
    orderBy: { sentToday: "asc" },
    take: 1,
  });
  const account = accounts[0];
  if (!account) return null;
  return {
    id: account.id,
    host: account.smtpHost,
    port: account.smtpPort || 587,
    user: account.smtpUser || account.email,
    pass: decrypt(account.smtpPass || ""),
    email: account.email,
  };
}

export async function incrementSentToday(accountId?: string): Promise<void> {
  if (!accountId) return;
  await prisma.emailAccount
    .update({ where: { id: accountId }, data: { sentToday: { increment: 1 } } })
    .catch(() => undefined);
}

export function getEnvSmtpConfig(): SmtpAccountConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    user,
    pass,
    email: user,
  };
}