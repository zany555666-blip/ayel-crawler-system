"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function ProductRow({
  p,
  onDelete,
  selected,
  editMode,
  onToggleSelect,
}: {
  p: any;
  onDelete: (id: string) => void;
  selected?: boolean;
  editMode?: boolean;
  onToggleSelect?: () => void;
}) {
  const { t } = useLang();
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm(t.products.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(id);
      } else {
        const d = await res.json();
        alert(d.error || t.products.deleteFail);
      }
    } catch {
      alert(t.networkError);
    }
  };

  return (
    <tr
      onClick={editMode ? onToggleSelect : undefined}
      className={`transition-colors ${
        editMode ? "cursor-pointer [&_a]:pointer-events-none [&_button]:pointer-events-none" : "hover:bg-[var(--surface2)]/50"
      } ${selected ? "bg-[var(--errbg)]/60" : ""}`}
    >
      <td className="px-5 py-3 font-mono text-[12px] text-[var(--muted)]">{p.sku}</td>
      <td className="px-5 py-3 text-[13px] font-medium">
        <Link href={`/products/${p.id}`} className="text-[var(--fg)] hover:underline">{p.name}</Link>
      </td>
      <td className="px-5 py-3 text-[13px] text-[var(--muted)]">{p.category || "-"}</td>
      <td className="px-5 py-3 text-[13px] text-[var(--fg)]">¥{Number(p.price).toLocaleString()}</td>
      <td className="px-5 py-3 text-[13px]">{p.moq}</td>
      <td className="px-5 py-3 text-[13px]">{p.leadTime}</td>
      <td className="px-5 py-3 text-[13px] text-[var(--muted)]">{p.vendor?.name || "-"}</td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.isActive ? "bg-[var(--okbg)] text-[var(--ok)]" : "bg-[var(--surface2)] text-[var(--muted)]"}`}>
          {p.isActive ? t.products.listed : t.products.unlisted}
        </span>
      </td>
      <td className="px-5 py-3">
        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[#ff3b30] hover:bg-[var(--surface2)] transition" title={t.common.delete}>
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
