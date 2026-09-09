"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Card";
import ProductRow from "@/components/dashboard/ProductRow";
import BatchDeleteBar from "@/components/dashboard/BatchDeleteBar";
import { useLang } from "@/i18n/LangContext";

export default function ProductsClient({ products: initial }: { products: any[] }) {
  const { t } = useLang();
  const [products, setProducts] = useState(initial);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const handleDelete = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
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
    if (!confirm(`确定批量删除选中的 ${selected.size} 个产品？此操作不可撤销`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        const ids = new Set(selected);
        setProducts((prev) => prev.filter((p) => !ids.has(p.id)));
        setSelected(new Set());
      } else {
        alert(data.error || t.products.deleteFail);
      }
    } catch {
      alert(t.networkError);
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.products.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.products.desc}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={editMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
          >
            <Pencil className="w-3.5 h-3.5" /> {editMode ? "完成" : "编辑"}
          </Button>
          <Link href="/products/new">
            <Button><Plus className="w-4 h-4" /> {t.products.add}</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)]" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.products.search}
            className="w-full h-10 pl-9 pr-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
          />
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
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.sku}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.name}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.category}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.price}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.moq}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.leadTime}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.vendor}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.status}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.products.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface2)]">
            {filtered.map((p) => (
              <ProductRow
                key={p.id}
                p={p}
                onDelete={handleDelete}
                selected={selected.has(p.id)}
                editMode={editMode}
                onToggleSelect={() => toggleSelect(p.id)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-[13px] text-[var(--sub)]">
                  {search ? t.products.noMatch : t.products.noProducts}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}