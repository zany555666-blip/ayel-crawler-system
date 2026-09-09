"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Card";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import OrderFilters from "@/components/dashboard/OrderFilters";
import BatchDeleteBar from "@/components/dashboard/BatchDeleteBar";
import { useLang } from "@/i18n/LangContext";

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  expectedDelivery: string | null;
  createdAt: string;
  vendor: { name: string };
}

export default function OrdersClient({ orders: initial }: { orders: Order[] }) {
  const { t } = useLang();
  const [orders, setOrders] = useState(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
    if (!confirm(`确定批量删除选中的 ${selected.size} 笔订单？此操作不可撤销`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        const ids = new Set(selected);
        setOrders((prev) => prev.filter((o) => !ids.has(o.id)));
        setSelected(new Set());
      } else {
        alert(data.error || "批量删除失败");
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
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.orders.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.orders.desc}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={editMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
          >
            <Pencil className="w-3.5 h-3.5" /> {editMode ? "完成" : "编辑"}
          </Button>
          <Link href="/orders/new">
            <Button><Plus className="w-4 h-4" /> {t.orders.new}</Button>
          </Link>
        </div>
      </div>

      <OrderFilters />

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
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.orderNumber}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.vendor}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.amount}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.expectedDelivery}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.status}</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider">{t.orders.createdAt}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface2)]">
            {orders.map((o) => {
              const isSelected = selected.has(o.id);
              return (
                <tr
                  key={o.id}
                  onClick={editMode ? () => toggleSelect(o.id) : undefined}
                  className={`transition-colors ${
                    editMode ? "cursor-pointer" : "hover:bg-[var(--surface2)]/50"
                  } ${isSelected ? "bg-[var(--errbg)]/60" : ""}`}
                >
                  <td className="px-5 py-3 font-mono text-[12px] text-[var(--muted)]">{o.orderNumber}</td>
                  <td className="px-5 py-3 text-[13px] font-medium text-[var(--fg)]">{o.vendor.name}</td>
                  <td className="px-5 py-3 text-[13px] text-[var(--fg)]">¥{Number(o.totalAmount).toLocaleString()}</td>
                  <td className="px-5 py-3 text-[13px] text-[var(--muted)]">{o.expectedDelivery ? formatDate(o.expectedDelivery) : "-"}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      o.status === "delivered" ? "bg-[var(--okbg)] text-[var(--ok)]" :
                      o.status === "cancelled" ? "bg-[var(--errbg)] text-[var(--err)]" :
                      o.status === "shipped" ? "bg-[var(--infobg)] text-[var(--info)]" :
                      "bg-[var(--warnbg)] text-[var(--warn)]"
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-[var(--sub)]">{formatDate(o.createdAt)}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-[var(--sub)]">{t.orders.noOrders}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}