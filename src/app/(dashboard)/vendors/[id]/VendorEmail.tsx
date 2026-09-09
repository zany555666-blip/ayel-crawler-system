"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Card";
import { Mail, Send } from "lucide-react";
import { useLang } from "@/i18n/LangContext";
import { generateBusinessEmail } from "@/lib/email/templates";

const TEMPLATES = [
  { key: "dev", label: "devLetter", lang: "zh" },
  { key: "quote", label: "quoteLetter", lang: "zh" },
  { key: "invite", label: "inviteLetter", lang: "zh" },
  { key: "dev_en", label: "devLetterEn", lang: "en" },
  { key: "dev_es", label: "devLetterEs", lang: "es" },
  { key: "custom", label: "customEmail", lang: "zh" },
];

export default function VendorEmail({ vendor }: { vendor: any }) {
  const { data: session } = useSession();
  const { t } = useLang();

  const templateLabels: Record<string, string> = {
    dev: t.vendors.devLetter,
    quote: t.vendors.quoteLetter,
    invite: t.vendors.inviteLetter,
    dev_en: t.vendors.devLetterEn,
    dev_es: t.vendors.devLetterEs,
    custom: t.vendors.customEmail,
  };
  const [template, setTemplate] = useState("dev");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleTemplate = (key: string) => {
    setTemplate(key);
    setSent(false);
    if (key === "custom") return;
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    const email = generateBusinessEmail({
      companyName: vendor.name,
      contactName: vendor.contactName || "负责人",
      ourCompany: "良友科技",
      products: "电子元件、机顶盒、扬声器、通信设备",
      language: tpl.lang,
    });
    setSubject(email.subject);
    setBody(email.body);
  };

  const handleSend = async () => {
    if (!subject || !body) return;
    setSending(true);
    try {
      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          toAddress: vendor.email || "",
          fromAddress: session?.user?.email || "",
          subject,
          body,
          language: template.includes("en") ? "en" : template.includes("es") ? "es" : "zh",
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json();
        alert(d.error || t.vendors.sendFail);
      }
    } catch {
      alert(t.networkError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
        <Mail className="w-[18px] h-[18px]" /> {t.vendors.sendEmail}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.vendors.sender}</label>
          <input value={session?.user?.email || ""} disabled className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--sub)]" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.vendors.recipient}</label>
          <input value={vendor.email || ""} disabled className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--sub)]" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.vendors.template}</label>
        <select value={template} onChange={(e) => handleTemplate(e.target.value)}
          className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition">
          {TEMPLATES.map((tp) => (<option key={tp.key} value={tp.key}>{templateLabels[tp.key]}</option>))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.vendors.subject}</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder={t.vendors.subjectPlaceholder}
          className="w-full h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition" />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.vendors.body}</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)}
          rows={8} placeholder={t.vendors.bodyPlaceholder}
          className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition resize-none" />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSend} disabled={sending || !subject || !body}>
          <Send className="w-4 h-4" /> {sending ? t.vendors.sending : sent ? t.vendors.sent : t.vendors.send}
        </Button>
        {sent && <span className="text-[12px] text-[var(--ok)]">邮件已保存发送</span>}
      </div>
    </div>
  );
}
