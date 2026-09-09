"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/i18n/LangContext";

export default function NewVendorPage() {
  const router = useRouter();
  const { t } = useLang();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", contactName: "", email: "", phone: "", address: "",
    country: "", website: "", category: "", status: "active", rating: "5",
    certificates: "", notes: "",
  });

  const update = (f: string, v: any) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError(t.vendors.nameRequired); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || null,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          country: form.country || null,
          website: form.website || null,
          category: form.category || null,
          status: form.status,
          rating: parseInt(form.rating) || 0,
          certificates: form.certificates || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) router.push("/vendors");
      else { const d = await res.json(); setError(d.error || t.vendors.createFail); }
    } catch { setError(t.networkError); }
    finally { setSaving(false); }
  };

  const f = (l: string, k: string, p = "", t = "text") => (
    <div>
      <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{l}</label>
      <input type={t} value={(form as any)[k]} onChange={(e) => update(k, e.target.value)} placeholder={p} className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition" />
    </div>
  );

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/vendors" className="text-[var(--muted)] hover:text-[var(--fg)] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.vendors.newTitle}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.vendors.newDesc}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {f(`${t.vendors.name} *`, "name", "良友科技有限公司")}
          {f(t.vendors.contact, "contactName", "张伟")}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {f(t.email, "email", "vendor@example.com")}
          {f(t.vendors.phone, "phone", "+86-138-0000-0001")}
        </div>
        {f(t.vendors.address, "address", "广东省深圳市宝安区")}
        <div className="grid grid-cols-3 gap-4">
          {f(t.vendors.country, "country", "中国")}
          {f(t.vendors.website, "website", "https://...")}
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.vendors.category}</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition">
              <option value="">{t.vendors.selectCategory}</option>
              <option value="raw_materials">{t.vendors.rawMaterials}</option>
              <option value="components">{t.vendors.components}</option>
              <option value="finished_goods">{t.vendors.finishedGoods}</option>
              <option value="logistics">{t.vendors.logistics}</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.vendors.status}</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)} className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition">
              <option value="active">{t.vendors.active}</option><option value="inactive">{t.vendors.inactive}</option><option value="pending">{t.vendors.pending}</option>
            </select>
          </div>
          {f(`${t.vendors.rating}(0-5)`, "rating", "5", "number")}
        </div>
        {f(t.vendors.certificates, "certificates", '["ISO9001","CE","RoHS"]')}
        <div>
          <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.vendors.notes}</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder={t.vendors.notesPlaceholder} className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition resize-none" />
        </div>
        {error && <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}><Save className="w-4 h-4" /> {saving ? t.vendors.saving : t.vendors.save}</Button>
          <Link href="/vendors"><Button variant="secondary">{t.common.cancel}</Button></Link>
        </div>
      </form>
    </div>
  );
}
