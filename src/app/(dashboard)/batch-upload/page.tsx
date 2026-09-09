"use client";

import { Button } from "@/components/ui/Card";
import { Upload, FileSpreadsheet } from "lucide-react";
import { useLang } from "@/i18n/LangContext";

export default function BatchUploadPage() {
  const { t } = useLang();
  return (
    <div className="space-y-7 max-w-xl">
      <div>
        <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.batchUpload.title}</h1>
        <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.batchUpload.desc}</p>
      </div>
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8">
        <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-12 text-center hover:border-[var(--sub)] transition cursor-pointer">
          <FileSpreadsheet className="w-10 h-10 text-[var(--sub)] mx-auto mb-4" />
          <p className="text-[14px] text-[var(--fg)] font-medium">{t.batchUpload.dropHint}</p>
          <p className="text-[12px] text-[var(--sub)] mt-1">{t.batchUpload.dropFormat}</p>
          <button className="mt-6 inline-flex items-center gap-2 h-10 px-6 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] transition">
            <Upload className="w-4 h-4" /> {t.batchUpload.selectFile}
          </button>
        </div>
      </div>
    </div>
  );
}
