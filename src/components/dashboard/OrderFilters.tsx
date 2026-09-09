"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/i18n/LangContext";

export default function OrderFilters() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-xs">
        <Search className="w-[15px] h-[15px] absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sub)]" strokeWidth={1.5} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const params = new URLSearchParams();
            const nq = formData.get("q") as string;
            const ns = formData.get("status") as string;
            if (nq) params.set("q", nq);
            if (ns) params.set("status", ns);
            router.push(`/orders?${params.toString()}`);
          }}
        >
          <input
            name="q"
            defaultValue={q}
            placeholder={t.orders.searchOrder}
            className="w-full h-9 pl-9 pr-4 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]"
          />
        </form>
      </div>
      <select
        value={status}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set("status", e.target.value);
          else params.delete("status");
          router.push(`/orders?${params.toString()}`);
        }}
        className="h-9 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--muted)] focus:outline-none focus:border-[var(--sub)]"
      >
        <option value="">{t.orders.allStatus}</option>
        <option value="pending">{t.orders.pending}</option>
        <option value="confirmed">{t.orders.confirmed}</option>
        <option value="processing">{t.orders.processing}</option>
        <option value="shipped">{t.orders.shipped}</option>
        <option value="delivered">{t.orders.delivered}</option>
        <option value="cancelled">{t.orders.cancelled}</option>
      </select>
    </div>
  );
}
