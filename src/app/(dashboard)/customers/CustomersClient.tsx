"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { Button, Badge } from "@/components/ui/Card";
import DeleteCustomerButton from "@/components/dashboard/DeleteCustomerButton";
import BatchDeleteBar from "@/components/dashboard/BatchDeleteBar";

const STATUS_LABELS: Record<string, string> = { lead: "线索", qualified: "已认证", negotiation: "谈判中", won: "已成交", lost: "已丢失" };
const STATUS_VARIANTS: Record<string, "success" | "danger" | "warning" | "info"> = { won: "success", lost: "danger", negotiation: "warning", lead: "info", qualified: "info" };

export default function CustomersClient({ customers: initial }: { customers: any[] }) {
  const [customers, setCustomers] = useState(initial);
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
    if (!confirm(`确定批量删除选中的 ${selected.size} 位客户？此操作不可撤销`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok) {
        const ids = new Set(selected);
        setCustomers((prev) => prev.filter((c) => !ids.has(c.id)));
        setSelected(new Set());
      } else {
        alert(data.error || "批量删除失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">客户管理</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">管理海外客户与大陆客户开发进度</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant={editMode ? "danger" : "secondary"}
            size="sm"
            onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
          >
            <Pencil className="w-3.5 h-3.5" /> {editMode ? "完成" : "编辑"}
          </Button>
          <Link href="/customers/new"><Button><Plus className="w-4 h-4" /> 添加客户</Button></Link>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => {
          const isSelected = selected.has(c.id);
          return (
            <div
              key={c.id}
              onClick={editMode ? () => toggleSelect(c.id) : undefined}
              className={`bg-[var(--surface)] rounded-2xl border p-5 transition-colors ${
                editMode ? "cursor-pointer [&_a]:pointer-events-none [&_button]:pointer-events-none" : "hover:border-[var(--sub)]"
              } ${isSelected ? "border-[#ff453a] bg-[var(--errbg)]" : "border-[var(--border)]"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[var(--fg)]">{c.name}</h3>
                    {c.customerType === "overseas" ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--infobg)] text-[var(--info)] rounded">海外</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--okbg)] text-[var(--ok)] rounded">大陆</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--sub)] mt-0.5">{c.company || "未填公司"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANTS[c.status] || "info"}>{STATUS_LABELS[c.status] || c.status}</Badge>
                  <DeleteCustomerButton id={c.id} onDeleted={(id) => setCustomers((prev) => prev.filter((x) => x.id !== id))} />
                </div>
              </div>
              <div className="space-y-1.5 text-[13px] text-[var(--muted)]">
                {c.country && <p>🌍 {c.country}</p>}
                {c.industry && <p>🏭 {c.industry}</p>}
                {c.source && <p>📌 来源: {c.source}</p>}
                <p className="text-[var(--fg)] font-medium">📧 {c._count.emails} 封邮件</p>
                <p className="text-[var(--fg)] font-semibold">💰 ¥{Number(c.totalValue).toLocaleString()}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={`/customers/${c.id}`} className="text-[13px] font-medium text-[var(--fg)] hover:underline">详情</Link>
                <Link href={`/emails/new?customerId=${c.id}`} className="text-[13px] font-medium text-[var(--fg)] hover:underline">写邮件</Link>
              </div>
            </div>
          );
        })}
        {customers.length === 0 && (
          <p className="text-[13px] text-[var(--sub)] lg:col-span-3 text-center py-16">暂无客户，点击右上角「添加客户」开始</p>
        )}
      </div>
    </div>
  );
}