"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, UserPlus, Loader2 } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

const SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "exhibition", label: "展会 Exhibition" },
  { value: "referral", label: "客户推荐 Referral" },
  { value: "web", label: "官网询盘 Web" },
  { value: "other", label: "其他 Other" },
];

const STATUSES = [
  { value: "lead", label: "线索 Lead" },
  { value: "qualified", label: "已认证 Qualified" },
  { value: "negotiation", label: "谈判中 Negotiation" },
  { value: "won", label: "已成交 Won" },
  { value: "lost", label: "已丢失 Lost" },
];

const INDUSTRIES = [
  "Industrial Automation",
  "Electronics",
  "Manufacturing",
  "Automotive",
  "Medical Devices",
  "Consumer Goods",
  "Energy",
  "Construction",
  "Aerospace",
  "Other",
];

export default function NewCustomerPage() {
  const router = useRouter();
  const { t } = useLang();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    industry: "",
    customerType: "overseas",
    source: "linkedin",
    status: "lead",
    notes: "",
  });

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError("客户名称为必填项"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          contactName: form.contactName || null,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          country: form.country || null,
          industry: form.industry || null,
          customerType: form.customerType,
          source: form.source,
          status: form.status,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        router.push("/customers");
      } else {
        const d = await res.json();
        setError(d.error || "创建失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: string, placeholder = "", type = "text", required = false) => (
    <div>
      <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
      />
    </div>
  );

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="text-[var(--muted)] hover:text-[var(--fg)] transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">添加客户</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">录入海外客户线索与开发进度</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-5">
        <div className="flex items-center gap-2 text-[13px] text-[var(--muted)] mb-2">
          <UserPlus className="w-4 h-4" />
          <span>客户基本信息</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field("客户名称", "name", "公司名或客户名", "text", true)}
          {field("联系人", "contactName", "联系人姓名")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field("邮箱", "email", "customer@example.com")}
          {field("电话", "phone", "+1-555-0123")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field("公司", "company", "公司全称")}
          {field("国家", "country", "Germany / USA / Mexico...")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">客户类型 *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => update("customerType", "overseas")}
                className={`flex-1 h-11 rounded-xl text-[13px] font-medium transition ${
                  form.customerType === "overseas"
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--sub)]"
                }`}
              >
                🌍 海外客户
              </button>
              <button
                type="button"
                onClick={() => update("customerType", "domestic")}
                className={`flex-1 h-11 rounded-xl text-[13px] font-medium transition ${
                  form.customerType === "domestic"
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--sub)]"
                }`}
              >
                🇨🇳 大陆客户
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">行业</label>
            <select
              value={form.industry}
              onChange={(e) => update("industry", e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
            >
              <option value="">选择行业</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">来源</label>
            <select
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">开发阶段</label>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => update("status", s.value)}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition ${
                  form.status === s.value
                    ? "bg-[var(--fg)] text-[var(--bg)]"
                    : "bg-[var(--surface2)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--sub)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">备注</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            placeholder="客户需求、沟通记录或其他备注..."
            className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition resize-none"
          />
        </div>

        {error && <p className="text-[13px] text-[#ff3b30] font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition active:scale-[0.97]"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 保存中...</>
            ) : (
              <><Save className="w-4 h-4" /> 保存客户</>
            )}
          </button>
          <Link
            href="/customers"
            className="inline-flex items-center h-10 px-5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[13px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
