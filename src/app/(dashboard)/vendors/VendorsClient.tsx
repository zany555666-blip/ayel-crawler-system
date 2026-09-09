"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button } from "@/components/ui/Card";
import VendorCrawl from "./VendorCrawl";
import { Trash2, Pencil } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import BatchDeleteBar from "@/components/dashboard/BatchDeleteBar";

export default function VendorsClient({ vendors: initial }: { vendors: any[] }) {
  const router = useRouter();
  const { t } = useLang();
  const [vendors, setVendors] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm(t.vendors.deleteConfirm)) return;
    try {
      await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      setVendors((prev) => prev.filter((v) => v.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch { alert(t.vendors.deleteFail); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelected(new Set());
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定批量删除选中的 ${selected.size} 家厂商？此操作不可撤销`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        const ids = new Set(selected);
        setVendors((prev) => prev.filter((v) => !ids.has(v.id)));
        setSelected(new Set());
      } else {
        alert(data.error || t.vendors.deleteFail);
      }
    } catch {
      alert(t.vendors.deleteFail);
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.vendors.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.vendors.desc}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={editMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
          >
            <Pencil className="w-3.5 h-3.5" /> {editMode ? "完成" : "编辑"}
          </Button>
          <VendorCrawl />
        </div>
      </div>

      {editMode && (
        <BatchDeleteBar
          selectedCount={selected.size}
          onDelete={handleBatchDelete}
          deleting={batchDeleting}
          onClear={() => setSelected(new Set())}
          onDone={exitEditMode}
        />
      )}

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--sub)]">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.name}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.contact}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.category}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.region}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.status}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.rating}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.vendors.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface2)]">
            {vendors.map((v) => {
              const isSelected = selected.has(v.id);
              return (
                <tr
                  key={v.id}
                  onClick={editMode ? () => toggleSelect(v.id) : undefined}
                  className={`transition-colors ${
                    editMode ? "cursor-pointer [&_a]:pointer-events-none [&_button]:pointer-events-none" : "hover:bg-[var(--surface2)]/50"
                  } ${isSelected ? "bg-[var(--errbg)]/60" : ""}`}
                >
                  <td className="px-5 py-3 text-[13px] font-medium">
                    <Link href={`/vendors/${v.id}`} className="text-[var(--fg)] hover:text-[#0071e3] transition-colors">{v.name}</Link>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[var(--muted)]">{v.contactName || "-"}</td>
                  <td className="px-5 py-3 text-[13px]">
                    {v.category && <span className="text-[11px] font-medium text-[#0071e3] bg-[var(--infobg)] px-2.5 py-0.5 rounded-lg">{v.category}</span>}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[var(--muted)]">{v.country || "-"} {v.address?.substring(0, 8) || ""}</td>
                  <td className="px-5 py-3">
                    <Badge variant={v.status === "active" ? "success" : "warning"}>
                      {v.status === "active" ? t.vendors.active : t.vendors.pending}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[#ffcc00]">{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[#ff3b30] hover:bg-[var(--surface2)] transition" title={t.common.delete}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {vendors.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[var(--sub)]">{t.vendors.noVendors}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}