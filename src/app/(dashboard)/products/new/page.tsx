"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/i18n/LangContext";

export default function NewProductPage() {
  const { t } = useLang();
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    nameEn: "",
    sku: "",
    category: "",
    subCategory: "",
    description: "",
    descriptionEn: "",
    price: "",
    currency: "CNY",
    moq: "1",
    leadTime: "15",
    unit: "pcs",
    vendorId: "",
    isActive: true,
    specifications: "",
    certifications: "",
  });

  useEffect(() => {
    fetch("/api/vendors")
      .then((r) => r.json())
      .then(setVendors)
      .catch(() => {});
  }, []);

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.sku) { setError(t.products.nameRequired); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          nameEn: form.nameEn || null,
          sku: form.sku,
          category: form.category || null,
          subCategory: form.subCategory || null,
          description: form.description || null,
          descriptionEn: form.descriptionEn || null,
          price: parseFloat(form.price) || 0,
          currency: form.currency,
          moq: parseInt(form.moq) || 1,
          leadTime: parseInt(form.leadTime) || 15,
          unit: form.unit,
          vendorId: form.vendorId || undefined,
          isActive: form.isActive,
          specifications: form.specifications || null,
          certifications: form.certifications || null,
        }),
      });
      if (res.ok) {
        router.push("/products");
      } else {
        const d = await res.json();
        setError(d.error || t.products.createFail);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, placeholder = "", type = "text") => (
    <div>
      <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{label}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
      />
    </div>
  );

  const textarea = (label: string, key: string, placeholder = "") => (
    <div>
      <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{label}</label>
      <textarea
        value={(form as any)[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition resize-none"
      />
    </div>
  );

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/products" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.products.newTitle}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.products.newDesc}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {field(`${t.products.name} *`, "name", t.products.namePlaceholder)}
          {field(t.products.nameEn, "nameEn", t.products.nameEnPlaceholder)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field(`SKU / ${t.products.name} *`, "sku", t.products.skuPlaceholder)}
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.products.vendor}</label>
            <select
              value={form.vendorId}
              onChange={(e) => update("vendorId", e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
            >
              <option value="">{t.products.selectVendor}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field(t.products.category, "category", t.products.categoryPlaceholder)}
          {field(t.products.subCategory, "subCategory", t.products.subCategoryPlaceholder)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {field(t.products.price, "price", t.products.pricePlaceholder, "number")}
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.products.currency}</label>
            <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition">
              <option value="CNY">CNY ¥</option><option value="USD">USD $</option><option value="EUR">EUR €</option>
            </select>
          </div>
          {field(t.products.moq, "moq", t.products.moqPlaceholder, "number")}
          {field(t.products.leadTime, "leadTime", t.products.leadTimePlaceholder, "number")}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {field(t.products.unit, "unit", t.products.unitPlaceholder)}
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="w-4 h-4 accent-white rounded" />
              <span className="text-[13px] text-[var(--muted)]">{t.products.active}</span>
            </label>
          </div>
        </div>
        {textarea(t.products.chineseDesc, "description", t.products.chineseDescPlaceholder)}
        {textarea(t.products.englishDesc, "descriptionEn", t.products.englishDescPlaceholder)}
        {field(t.products.specs, "specifications", t.products.specsPlaceholder)}
        {field(t.products.certs, "certifications", t.products.certsPlaceholder)}

        {error && <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? t.products.saving : t.products.save}
          </Button>
          <Link href="/products">
            <Button variant="secondary">{t.common.cancel}</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
