"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import AyelPetIcon from "@/components/AyelPetIcon";

export default function RegisterPage() {
  const router = useRouter();
  const { t, lang, toggleLang } = useLang();
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError(t.passwordMismatch);
      return;
    }

    if (form.password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await res.json();
        setError(data.error || t.registerFailed);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] py-12">
      <button
        onClick={toggleLang}
        className="fixed top-5 right-5 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium text-[var(--muted)] bg-[var(--surface2)] border border-[var(--border)] hover:text-[var(--fg)] hover:bg-[var(--surface3)] transition"
      >
        <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
        {lang === "zh" ? "EN" : "中文"}
      </button>

      <div className="w-full max-w-[380px] px-4">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-5">
            <AyelPetIcon className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-[22px] font-bold text-[var(--fg)] tracking-tight">{t.brand}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-1.5">{t.subtitle}</p>
        </div>

        <div className="bg-[var(--surface2)] rounded-[20px] border border-[var(--border)] p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.name}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.email}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.company}</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.password}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.confirmPassword}</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--border)] focus:bg-[var(--surface3)] transition"
                required
              />
            </div>
            {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[var(--fg)] text-[var(--bg)] text-sm font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-40 transition-all duration-200 active:scale-[0.98] mt-2"
            >
              {loading ? t.registerLoading : t.register}
            </button>
          </form>
          <p className="text-center text-[13px] text-[var(--muted)] mt-6">
            {t.hasAccount}{" "}
            <Link href="/login" className="text-[var(--fg)] font-medium hover:underline">
              {t.login}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
