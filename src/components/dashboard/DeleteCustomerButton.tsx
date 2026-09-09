"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function DeleteCustomerButton({ id, onDeleted }: { id: string; onDeleted?: (id: string) => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("确定删除该客户？相关邮件也会被删除。")) return;
    setDeleting(true);
    try {
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (onDeleted) onDeleted(id);
      router.refresh();
    } catch {
      alert("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[#ff3b30] hover:bg-[var(--surface2)] transition"
      title="删除"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
