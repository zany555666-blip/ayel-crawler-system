import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import VendorEmail from "./VendorEmail";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { _count: { select: { products: true, orders: true } } },
  });
  if (!vendor) notFound();

  const certs = (() => { try { return JSON.parse(vendor.certificates || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/vendors" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{vendor.name}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">厂商详情</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">基本信息</h3>
            <div className="space-y-3 text-sm">
              <DetailRow label="分类" value={vendor.category || "-"} />
              <DetailRow label="状态" value={vendor.status === "active" ? "活跃" : vendor.status === "inactive" ? "非活跃" : "待审核"} />
              <DetailRow label="评分" value={"★".repeat(vendor.rating) + "☆".repeat(5 - vendor.rating)} />
              <DetailRow label="国家" value={vendor.country || "-"} />
              <DetailRow label="网址" value={vendor.website || "-"} href={vendor.website || undefined} />
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">联系方式</h3>
            <div className="space-y-3 text-sm">
              <DetailRow label="联系人" value={vendor.contactName || "-"} />
              <DetailRow label="邮箱" value={vendor.email || "-"} />
              <DetailRow label="电话" value={vendor.phone || "-"} />
              <DetailRow label="地址" value={vendor.address || "-"} />
            </div>
          </div>
        </div>

        {certs.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">认证资质</h3>
            <div className="flex flex-wrap gap-2">
              {certs.map((c: string) => (
                <span key={c} className="px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}

        {vendor.notes && (
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">备注</h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">{vendor.notes}</p>
          </div>
        )}

        <div className="flex gap-8 text-[13px] text-[var(--muted)] border-t border-[var(--border)] pt-5">
          <span>关联产品: <strong className="text-[var(--fg)]">{vendor._count.products}</strong></span>
          <span>关联订单: <strong className="text-[var(--fg)]">{vendor._count.orders}</strong></span>
        </div>
      </div>

      <VendorEmail vendor={JSON.parse(JSON.stringify(vendor))} />
    </div>
  );
}

function DetailRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--sub)]">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:underline font-medium text-right max-w-[60%] truncate">{value}</a>
      ) : (
        <span className="text-[var(--fg)] font-medium text-right max-w-[60%] truncate">{value}</span>
      )}
    </div>
  );
}
