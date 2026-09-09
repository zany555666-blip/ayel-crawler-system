import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency: string = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateOrderNumber(): string {
  const now = new Date();
  const prefix = "SC";
  const dateStr = [
    now.getFullYear().toString().slice(2),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${dateStr}${random}`;
}

export function statusMap(
  status: string
): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: "活跃", color: "bg-green-100 text-green-800" },
    inactive: { label: "非活跃", color: "bg-gray-100 text-gray-800" },
    pending: { label: "待处理", color: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: "已确认", color: "bg-blue-100 text-blue-800" },
    processing: { label: "处理中", color: "bg-indigo-100 text-indigo-800" },
    shipped: { label: "已发货", color: "bg-purple-100 text-purple-800" },
    delivered: { label: "已交付", color: "bg-green-100 text-green-800" },
    cancelled: { label: "已取消", color: "bg-red-100 text-red-800" },
    lead: { label: "线索", color: "bg-gray-100 text-gray-800" },
    qualified: { label: "已认证", color: "bg-blue-100 text-blue-800" },
    negotiation: { label: "谈判中", color: "bg-yellow-100 text-yellow-800" },
    won: { label: "已成交", color: "bg-green-100 text-green-800" },
    lost: { label: "已丢失", color: "bg-red-100 text-red-800" },
    draft: { label: "草稿", color: "bg-gray-100 text-gray-800" },
    sent: { label: "已发送", color: "bg-blue-100 text-blue-800" },
    failed: { label: "发送失败", color: "bg-red-100 text-red-800" },
  };
  return map[status] || { label: status, color: "bg-gray-100 text-gray-800" };
}
