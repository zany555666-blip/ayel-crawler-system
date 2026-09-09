"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import AyelPetIcon from "@/components/AyelPetIcon";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, toggleLang } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.startsWith("LOCKED_")) {
        const minutes = result.error.split("_")[1];
        setError(`${t.locked} ${minutes} ${t.lockedMinutes}`);
      } else {
        setError(t.loginError);
      }
    } else {
      router.push("/crawl-center");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--bg)] overflow-hidden">
      <button
        onClick={toggleLang}
        className="fixed top-5 right-5 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[var(--muted)] bg-[var(--surface2)]/80 backdrop-blur border border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface3)] transition"
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
        {lang === "zh" ? "EN" : "中文"}
      </button>

      <div className="w-full max-w-[380px] px-4 relative z-10">
        <div className="text-center mb-10">
          <img
            src="/logo.png"
            alt="logo"
            className="w-14 h-14 rounded-2xl object-contain mx-auto mb-5 shadow-[0_0_24px_rgba(255,255,255,0.15)]"
            draggable={false}
          />
          <h1 className="text-[22px] font-bold text-[var(--fg)] tracking-tight drop-shadow">{t.brand}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-1.5 drop-shadow">{t.subtitle}</p>
        </div>

        <div className="bg-[var(--surface2)]/70 backdrop-blur-md rounded-[20px] border border-[var(--border)] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-semibold text-[var(--fg)] mb-5 tracking-tight">{t.loginTitle}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                placeholder="admin@supplyai.com"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-[13px] text-red-400 font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[var(--fg)] text-[var(--bg)] text-sm font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading ? t.loginLoading : t.login}
            </button>
          </form>
          <p className="text-center text-[13px] text-[var(--muted)] mt-6">
            {t.noAccount}{" "}
            <Link href="/register" className="text-[var(--fg)] font-medium hover:underline">
              {t.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
