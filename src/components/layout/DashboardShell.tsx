"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useLang } from "@/i18n/LangContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLang();

  return (
    <div className="flex h-screen bg-[var(--bg)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 h-12 px-4 border-b border-[var(--surface2)] bg-[var(--bg)] shrink-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--fg)] hover:bg-[var(--surface2)] transition"
            aria-label="menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-[var(--fg)] truncate">{t.brandShort || t.brand}</span>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}