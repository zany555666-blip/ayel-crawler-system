import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Globe, Building2, MapPin, Tag, Clock, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import DeleteCustomerButton from "@/components/dashboard/DeleteCustomerButton";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { emails: true } },
      emails: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!customer) notFound();

  const statusLabel: Record<string, string> = {
    lead: "线索",
    qualified: "已认证",
    negotiation: "谈判中",
    won: "已成交",
    lost: "已丢失",
  };
  const statusColor: Record<string, string> = {
    lead: "bg-[var(--infobg)] text-[var(--info)]",
    qualified: "bg-[var(--okbg)] text-[var(--ok)]",
    negotiation: "bg-[var(--warnbg)] text-[var(--warn)]",
    won: "bg-[var(--okbg)] text-[var(--ok)]",
    lost: "bg-[var(--errbg)] text-[var(--err)]",
  };

  const sourceLabel: Record<string, string> = {
    linkedin: "LinkedIn",
    exhibition: "展会",
    referral: "客户推荐",
    web: "官网询盘",
    other: "其他",
  };

  return (
    <div className="space-y-7 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{customer.name}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${customer.customerType === "overseas" ? "bg-[var(--infobg)] text-[var(--info)]" : "bg-[var(--okbg)] text-[var(--ok)]"}`}>
              {customer.customerType === "overseas" ? "🌍 海外客户" : "🇨🇳 大陆客户"}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${statusColor[customer.status] || "bg-[var(--surface2)] text-[var(--muted)]"}`}>
              {statusLabel[customer.status] || customer.status}
            </span>
          </div>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{customer.company || "未填公司"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-4">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={<Building2 className="w-4 h-4" />} label="公司" value={customer.company || "—"} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="国家" value={customer.country || "—"} />
              <InfoRow icon={<Tag className="w-4 h-4" />} label="行业" value={customer.industry || "—"} />
              <InfoRow icon={<Globe className="w-4 h-4" />} label="来源" value={sourceLabel[customer.source || ""] || customer.source || "—"} />
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-4">联系方式</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={<Mail className="w-4 h-4" />} label="联系人" value={customer.contactName || "—"} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="电话" value={customer.phone || "—"} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="邮箱" value={customer.email || "—"} copyable />
            </div>
          </div>

          {customer.notes && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
              <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-4">备注</h3>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">统计</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--sub)]">邮件数</span>
                <span className="text-[var(--fg)] font-semibold">{customer._count.emails}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--sub)]">总价值</span>
                <span className="text-[var(--fg)] font-semibold">¥{Number(customer.totalValue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--sub)]">最近联系</span>
                <span className="text-[var(--fg)]">
                  {customer.lastContactAt ? formatDateTime(customer.lastContactAt) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href={`/emails/new?customerId=${customer.id}`}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] transition active:scale-[0.97]"
            >
              <Mail className="w-4 h-4" />
              写邮件
            </Link>
            <DeleteCustomerButton id={customer.id} />
          </div>

          {customer.emails.length > 0 && (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
              <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">
                最近邮件 ({customer.emails.length})
              </h3>
              <div className="space-y-2">
                {customer.emails.map((email) => (
                  <Link
                    key={email.id}
                    href={`/emails/${email.id}`}
                    className="block p-3 bg-[var(--surface2)] rounded-xl hover:bg-[var(--border)] transition"
                  >
                    <p className="text-[12px] text-[var(--fg)] font-medium truncate">{email.subject}</p>
                    <p className="text-[11px] text-[var(--sub)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(email.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  copyable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-[var(--sub)] mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-[var(--fg)] truncate">{value}</p>
      </div>
    </div>
  );
}
