"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AyelPetIcon from "@/components/AyelPetIcon";
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  ShoppingCart,
  MessageSquare,
  Mail,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Globe,
  Radio,
  Database,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { useLang } from "@/i18n/LangContext";

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const { t, lang, toggleLang } = useLang();

  const businessGroup = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/vendors", label: t.nav.vendors, icon: Building2 },
    { href: "/products", label: t.nav.products, icon: Package },
    { href: "/customers", label: t.nav.customers, icon: Users },
    { href: "/orders", label: t.nav.orders, icon: ShoppingCart },
  ];

  const aiGroup = [
    { href: "/ai-chat", label: t.nav.aiChat, icon: MessageSquare },
    { href: "/campaigns", label: t.nav.emails, icon: Mail },
  ];

  const sysGroup = [
    { href: "/vector-db", label: t.nav.vectorDb, icon: Database },
    { href: "/analytics", label: t.nav.analytics, icon: BarChart3 },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  const renderGroup = (items: typeof businessGroup, highlight?: boolean, dot?: boolean) =>
    items.map((item) => {
      const isActive = pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 relative",
            collapsed && "justify-center px-2",
            isActive
              ? "bg-[var(--fg)] text-[var(--bg)]"
              : highlight
              ? "text-[var(--fg)] hover:bg-[var(--surface2)]"
              : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface2)]"
          )}
        >
          <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {dot && !collapsed && (
            <span className="ml-auto w-2 h-2 rounded-full bg-[var(--err)] animate-pulse flex-shrink-0" />
          )}
          {dot && collapsed && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--err)] animate-pulse" />
          )}
        </Link>
      );
    });

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[var(--bg)] border-r border-[var(--surface2)] transition-transform duration-300 md:transition-all",
        collapsed ? "w-[72px]" : "w-[220px]",
        "fixed inset-y-0 left-0 z-50 md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div
        className={cn(
          "flex items-center h-12 px-4 border-b border-[var(--surface2)]",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="logo"
              className="w-7 h-7 rounded-lg object-contain flex-shrink-0"
              draggable={false}
            />
            <div className="min-w-0 leading-tight">
              <span className="font-semibold text-[12px] text-[var(--fg)] block truncate">{t.brandShort || t.brand}</span>
              <span className="text-[10px] text-[var(--sub)] block truncate">{t.subtitle}</span>
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[var(--surface2)] transition"
        >
          <ChevronLeft className={cn("w-3 h-3 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 py-3 space-y-2 overflow-y-auto">
        <div className="px-2">
          <Link
            href="/crawl-center"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 relative overflow-hidden group",
              collapsed && "justify-center px-2",
              pathname.startsWith("/crawl-center")
                ? "bg-[var(--fg)] text-[var(--bg)]"
                : "text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--surface2)]"
            )}
          >
            <AyelPetIcon className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span className="truncate">{t.nav.crawlCenter}</span>}
            {!pathname.startsWith("/crawl-center") && !collapsed && (
              <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </Link>
        </div>

        {!collapsed && (
          <p className="px-4 text-[10px] font-semibold text-[var(--sub)] uppercase tracking-widest">{t.nav.groupBusiness}</p>
        )}
        <div className="px-2 space-y-0.5">{renderGroup(businessGroup)}</div>

        <div className="px-2"><div className="border-t border-[var(--border)] my-1" /></div>

        {!collapsed && (
          <p className="px-4 text-[10px] font-semibold text-[var(--sub)] uppercase tracking-widest">{t.nav.groupAI}</p>
        )}
        <div className="px-2 space-y-0.5">{renderGroup(aiGroup, true, true)}</div>

        <div className="px-2"><div className="border-t border-[var(--border)] my-1" /></div>

        {!collapsed && (
          <p className="px-4 text-[10px] font-semibold text-[var(--sub)] uppercase tracking-widest">{t.nav.groupSystem}</p>
        )}
        <div className="px-2 space-y-0.5">{renderGroup(sysGroup)}</div>

        <div className="px-2"><div className="border-t border-[var(--border)] my-1" /></div>

        <div className="px-2">
          <Link
            href="/crawler-config"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
              "text-[var(--fg)] hover:bg-[var(--surface2)] border border-[var(--border)]",
              collapsed && "justify-center px-2"
            )}
          >
            <Radio className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">{t.nav.crawler}</span>}
          </Link>
        </div>
      </nav>

      <div className="border-t border-[var(--surface2)]">
        <button
          onClick={toggleLang}
          className={cn(
            "flex items-center gap-2 w-full px-4 py-2 text-[11px] text-[var(--muted)] hover:bg-[var(--surface2)] hover:text-[var(--fg)] transition",
            collapsed && "justify-center px-2"
          )}
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && <span>{lang === "zh" ? "English" : "简体中文"}</span>}
        </button>

        <div className={cn("flex items-center gap-2 px-4 pb-3 pt-1", collapsed && "justify-center px-2")}>
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black text-[11px] font-semibold flex-shrink-0">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-[12px] font-medium text-[var(--fg)] truncate">{session?.user?.name || "User"}</p>
              <p className="text-[10px] text-[var(--sub)] truncate">{session?.user?.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1 rounded-full text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[var(--surface2)] transition flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
