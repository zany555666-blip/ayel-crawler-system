"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/Card";
import { useState, useEffect } from "react";
import { useLang } from "@/i18n/LangContext";
import { useRouter } from "next/navigation";

const VENDORS = [
  { value: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"] },
  { value: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"] },
  { value: "zhipu", label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", models: ["glm-4", "glm-4-plus", "glm-4-flash", "glm-3-turbo"] },
  { value: "moonshot", label: "Moonshot (Kimi)", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"] },
  { value: "qwen", label: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long"] },
  { value: "custom", label: "自定义", baseUrl: "", models: [] },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t } = useLang();
  const [name, setName] = useState(session?.user?.name || "");
  const [saved, setSaved] = useState(false);

  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [configLoading, setConfigLoading] = useState(true);
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.provider) setProvider(d.provider);
        if (d.apiKey) setApiKey(d.apiKey);
        if (d.baseUrl) setBaseUrl(d.baseUrl);
        if (d.modelName) setModelName(d.modelName);
      })
      .finally(() => setConfigLoading(false));
  }, []);

  const handleVendorChange = (v: string) => {
    setProvider(v);
    const vendor = VENDORS.find((x) => x.value === v);
    if (vendor && v !== "custom") {
      setBaseUrl(vendor.baseUrl);
      if (vendor.models.length > 0) setModelName(vendor.models[0]);
    }
  };

  const currentVendor = VENDORS.find((v) => v.value === provider);
  const modelOptions = currentVendor?.models || [];

  const saveConfig = async () => {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey, baseUrl, modelName }),
    });
    setApiSaved(true);
  };

  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [logs, setLogs] = useState<Array<{ id: string; email: string; ip: string | null; userAgent: string | null; success: boolean; createdAt: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/login-logs")
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, []);

  const changePassword = async () => {
    setPwdError("");
    if (newPassword !== confirmNewPassword) {
      setPwdError(t.settings.pwdMismatch);
      return;
    }
    setPwdLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    setPwdLoading(false);
    if (!res.ok) {
      setPwdError(data.error || t.settings.pwdChanged);
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", { hour12: false });
  };

  const shortAgent = (ua: string | null) => {
    if (!ua) return "-";
    if (ua.includes("Edg/")) return `Edge ${ua.match(/Edg\/(\d+)/)?.[1] || ""}`;
    if (ua.includes("Chrome/")) return `Chrome ${ua.match(/Chrome\/(\d+)/)?.[1] || ""}`;
    if (ua.includes("Firefox/")) return `Firefox ${ua.match(/Firefox\/(\d+)/)?.[1] || ""}`;
    if (ua.includes("Safari/")) return "Safari";
    return ua.slice(0, 40);
  };

  if (configLoading) return null;

  return (
    <div className="space-y-7 max-w-xl">
      <div>
        <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.settings.title}</h1>
        <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.settings.desc}</p>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">{t.settings.profile}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.email}</label>
            <input type="email" value={session?.user?.email || ""} disabled className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--sub)]" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.name}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.role}</label>
            <input type="text" value={(session?.user as any)?.role || ""} disabled className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--sub)]" />
          </div>
          <Button onClick={() => setSaved(true)} size="sm">{saved ? t.settings.saved : t.settings.save}</Button>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">{t.settings.apiConfig}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.apiProvider}</label>
            <select
              value={provider}
              onChange={(e) => handleVendorChange(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
            >
              {VENDORS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.apiKey}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.settings.apiKeyPlaceholder}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition font-mono"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.apiUrl}</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition font-mono"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.modelName}</label>
            {modelOptions.length > 0 ? (
              <select
                value={modelOptions.includes(modelName) ? modelName : modelOptions[0]}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="例如：custom-model-name"
                className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
              />
            )}
          </div>
          <Button onClick={saveConfig} size="sm">{apiSaved ? t.settings.saved : t.settings.saveApi}</Button>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">{t.settings.security}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.oldPassword}</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.newPassword}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t.settings.confirmNewPassword}</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] transition"
              autoComplete="new-password"
            />
          </div>
          {pwdError && <p className="text-[13px] text-red-400 font-medium">{pwdError}</p>}
          <Button onClick={changePassword} size="sm" disabled={pwdLoading}>
            {pwdLoading ? "..." : t.settings.changePassword}
          </Button>
          <p className="text-[12px] text-[var(--sub)]">{t.settings.pwdChanged}</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
        <h3 className="text-sm font-semibold text-[var(--fg)] mb-5">{t.settings.loginLogs}</h3>
        {logsLoading ? (
          <p className="text-[13px] text-[var(--sub)]">...</p>
        ) : logs.length === 0 ? (
          <p className="text-[13px] text-[var(--sub)]">{t.common.noData}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[var(--sub)] border-b border-[var(--border)]">
                  <th className="py-2 pr-4 font-medium">{t.settings.loginTime}</th>
                  <th className="py-2 pr-4 font-medium">{t.email}</th>
                  <th className="py-2 pr-4 font-medium">{t.settings.loginIp}</th>
                  <th className="py-2 pr-4 font-medium">{t.settings.loginDevice}</th>
                  <th className="py-2 font-medium">{t.settings.loginResult}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] text-[var(--fg)]">
                    <td className="py-2.5 pr-4 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                    <td className="py-2.5 pr-4">{log.email}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px]">{log.ip || "-"}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{shortAgent(log.userAgent)}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
                          log.success ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${log.success ? "bg-emerald-400" : "bg-red-400"}`} />
                        {log.success ? t.settings.loginSuccess : t.settings.loginFail}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
