"use client";

import { Trash2, X } from "lucide-react";

interface BatchDeleteBarProps {
  selectedCount: number;
  onDelete: () => void;
  deleting?: boolean;
  onClear: () => void;
  onDone: () => void;
}

export default function BatchDeleteBar({
  selectedCount,
  onDelete,
  deleting,
  onClear,
  onDone,
}: BatchDeleteBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--errbg)] bg-[var(--errbg)] animate-[fade-up_0.3s_ease]">
      <span className="text-[13px] text-[var(--err)] font-medium">
        {selectedCount > 0 ? `已选择 ${selectedCount} 项` : "点击列表项进行选择"}
      </span>
      {selectedCount > 0 && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--fg)] transition"
        >
          <X className="w-3.5 h-3.5" /> 取消选择
        </button>
      )}
      <button
        onClick={onDelete}
        disabled={deleting || selectedCount === 0}
        className="ml-auto inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[var(--err)] text-white text-[12px] font-semibold hover:bg-[#d9382e] disabled:opacity-40 transition"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {deleting ? "删除中…" : "批量删除"}
      </button>
      <button
        onClick={onDone}
        className="inline-flex items-center h-8 px-4 rounded-full bg-[var(--surface2)] text-[var(--fg)] text-[12px] font-medium hover:bg-[var(--surface3)] border border-[var(--border)] transition"
      >
        完成
      </button>
    </div>
  );
}