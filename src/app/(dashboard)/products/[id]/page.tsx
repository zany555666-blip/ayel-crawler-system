import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { vendor: true },
  });
  if (!product) notFound();

  const specs = (() => { try { return JSON.parse(product.specifications || "{}"); } catch { return {}; } })();
  const certs = (() => { try { return JSON.parse(product.certifications || "[]"); } catch { return []; } })();

  return (
    <div className="space-y-7 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{product.name}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">产品详情</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">基本信息</h3>
            <div className="space-y-3 text-sm">
              <Row label="SKU" value={product.sku} />
              <Row label="英文名" value={product.nameEn || "-"} />
              <Row label="分类" value={product.category || "-"} />
              <Row label="子分类" value={product.subCategory || "-"} />
              <Row label="单位" value={product.unit} />
              <Row label="状态" value={product.isActive ? "上架" : "下架"} />
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">商务信息</h3>
            <div className="space-y-3 text-sm">
              <Row label="价格" value={`${product.currency === "USD" ? "$" : product.currency === "EUR" ? "€" : "¥"}${Number(product.price).toLocaleString()}`} />
              <Row label="币种" value={product.currency} />
              <Row label="MOQ" value={String(product.moq)} />
              <Row label="交期" value={`${product.leadTime} 天`} />
              <Row label="厂商" value={product.vendor?.name || "-"} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">中文描述</h3>
          <p className="text-[13px] text-[var(--muted)] leading-relaxed">{product.description || "暂无描述"}</p>
        </div>

        {product.descriptionEn && (
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">English Description</h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">{product.descriptionEn}</p>
          </div>
        )}

        {Object.keys(specs).length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">规格参数</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(specs).map(([k, v]) => (
                <div key={k} className="flex justify-between bg-[var(--surface2)] rounded-lg px-4 py-2.5 text-[13px]">
                  <span className="text-[var(--sub)]">{k}</span>
                  <span className="text-[var(--fg)] font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {certs.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-3">认证</h3>
            <div className="flex flex-wrap gap-2">
              {certs.map((c: string) => (
                <span key={c} className="px-3 py-1.5 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--sub)]">{label}</span>
      <span className="text-[var(--fg)] font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
