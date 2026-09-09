"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database, Sparkles, RefreshCw, Search, HardDrive, Layers, BrainCircuit, RotateCcw,
  BookOpen, FilePlus2, Trash2, Upload, MessageSquare, Send, Pencil,
} from "lucide-react";
import { useLang } from "@/i18n/LangContext";

interface TableStat { name: string; label: string; rows: number; }
interface Stats {
  database: { file: string; engine: string; sizeBytes: number; tables: TableStat[]; totalRows: number };
  vector: { dim: number; total: number; vectorized: number; coverage: number };
}
interface SearchResult { id: string; title: string; content: string; similarity: number; }

export default function VectorDbPage() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [reindexing, setReindexing] = useState(false);

  const [kbQuery, setKbQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [indexProductId, setIndexProductId] = useState("");
  const [indexLoading, setIndexLoading] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", content: "", tags: "", language: "zh", productId: "" });
  const [writing, setWriting] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vector-db/stats");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setStats(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadStats); }, [loadStats]);

  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await fetch("/api/rag/entries");
      if (res.ok) setEntries(await res.json());
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setProducts(list))
      .catch(() => undefined);
  }, [loadEntries]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/vector-db/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "检索失败");
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "检索失败");
    } finally {
      setSearching(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await fetch("/api/rag/batch-index", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`重建完成：${data.reindexed ?? data.count ?? 0} 条向量已更新`);
        await loadStats();
        await loadEntries();
      } else {
        alert(data.error || "重建失败");
      }
    } catch {
      alert("重建失败");
    } finally {
      setReindexing(false);
    }
  };

  const handleKbSearch = async () => {
    if (!kbQuery.trim()) return;
    setKbLoading(true);
    try {
      const res = await fetch("/api/rag/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: kbQuery }) });
      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch {
      setAnswer(t.knowledge.queryError);
    } finally {
      setKbLoading(false);
    }
  };

  const handleIndexProduct = async () => {
    if (!indexProductId.trim()) return;
    setIndexLoading(true);
    try {
      const res = await fetch("/api/rag/index-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: indexProductId }) });
      if (res.ok) {
        alert(t.knowledge.indexOK);
        setIndexProductId("");
        await loadStats();
        await loadEntries();
      } else {
        alert(t.knowledge.indexFail);
      }
    } finally {
      setIndexLoading(false);
    }
  };

  const handleWrite = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert("标题和内容不能为空");
      return;
    }
    setWriting(true);
    try {
      const res = await fetch("/api/rag/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          tags: form.tags,
          language: form.language,
          productId: form.productId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ title: "", content: "", tags: "", language: "zh", productId: "" });
        await loadEntries();
        await loadStats();
        alert("已写入向量库");
      } else {
        alert(data.error || "写入失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setWriting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("确定删除该知识条目？")) return;
    const res = await fetch("/api/rag/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      await loadStats();
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", tags: "", language: "zh", productId: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditForm({
      title: e.title || "",
      content: e.content || "",
      tags: e.tags || "",
      language: e.language || "zh",
      productId: e.productId || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      alert("标题和内容不能为空");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch("/api/rag/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        await loadEntries();
        await loadStats();
        alert("已保存并重新嵌入向量");
      } else {
        alert(data.error || "保存失败");
      }
    } catch {
      alert("网络错误");
    } finally {
      setSavingEdit(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const maxRows = Math.max(1, ...(stats?.database.tables.map((table) => table.rows) || [1]));

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--fg)] tracking-tight">{t.vectorDb.title}</h1>
          <p className="text-[15px] text-[var(--muted)] mt-0.5">{t.vectorDb.desc}</p>
        </div>
        <button onClick={loadStats} className="inline-flex items-center gap-1.5 h-9 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[12px] font-medium rounded-full hover:bg-[var(--surface3)] hover:text-[var(--fg)] transition">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t.vectorDb.refresh}
        </button>
      </div>

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-5">
        {/* SQLite 数据库卡片 */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
              <Database className="w-[18px] h-[18px]" strokeWidth={2} /> {t.vectorDb.sqlite}
            </h3>
            <span className="px-2 py-0.5 bg-[var(--okbg)] text-[var(--ok)] rounded-md text-[11px] font-medium">● 运行中</span>
          </div>
          <p className="text-[12px] text-[var(--muted)]">{t.vectorDb.sqliteDesc}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider flex items-center gap-1"><Layers className="w-3 h-3" /> {t.vectorDb.engine}</p>
              <p className="text-[13px] text-[var(--fg)] font-medium mt-1">{stats?.database.engine || "—"}</p>
            </div>
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider flex items-center gap-1"><HardDrive className="w-3 h-3" /> {t.vectorDb.dbFile}</p>
              <p className="text-[13px] text-[var(--fg)] font-medium mt-1 font-mono">{stats?.database.file || "—"}</p>
            </div>
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.dbSize}</p>
              <p className="text-[13px] text-[var(--fg)] font-medium mt-1">{stats ? formatBytes(stats.database.sizeBytes) : "—"}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.tables}</p>
              <p className="text-[11px] text-[var(--muted)]">{t.vectorDb.totalRows}: <span className="text-[var(--fg)] font-semibold">{stats?.database.totalRows ?? 0}</span></p>
            </div>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {stats?.database.tables.map((table) => (
                <div key={table.name} className="flex items-center gap-3">
                  <span className="w-32 flex-shrink-0 text-[12px] text-[var(--muted)] truncate" title={table.name}>{table.label}</span>
                  <span className="w-24 flex-shrink-0 text-[10px] text-[var(--sub)] font-mono truncate">{table.name}</span>
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0071e3] to-[#4dd0e1] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, Math.round((table.rows / maxRows) * 100))}%` }}
                    />
                  </div>
                  <span className="w-12 flex-shrink-0 text-right text-[12px] text-[var(--fg)] font-medium">{table.rows}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RAG 向量库卡片 */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
              <BrainCircuit className="w-[18px] h-[18px]" strokeWidth={2} /> {t.vectorDb.vector}
            </h3>
            <span className="px-2 py-0.5 bg-[var(--infobg)] text-[#0071e3] rounded-md text-[11px] font-medium">256-dim</span>
          </div>
          <p className="text-[12px] text-[var(--muted)]">{t.vectorDb.vectorDesc}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.entries}</p>
              <p className="text-[20px] font-bold text-[var(--fg)] mt-1">{stats?.vector.total ?? 0}</p>
            </div>
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.vectorized}</p>
              <p className="text-[20px] font-bold text-[var(--ok)] mt-1">{stats?.vector.vectorized ?? 0}</p>
            </div>
            <div className="bg-[var(--surface2)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.dimension}</p>
              <p className="text-[20px] font-bold text-[#0071e3] mt-1">{stats?.vector.dim ?? 256}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider">{t.vectorDb.coverage}</p>
              <p className="text-[12px] text-[var(--fg)] font-semibold">{stats?.vector.coverage ?? 0}%</p>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${stats?.vector.coverage ?? 0}%`,
                  background: "linear-gradient(90deg, #0071e3, #30d158)",
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] text-[var(--sub)] uppercase tracking-wider mb-1.5">{t.knowledge.index}（产品 UUID）</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={indexProductId}
                onChange={(e) => setIndexProductId(e.target.value)}
                placeholder="输入产品UUID"
                className="flex-1 h-9 px-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]"
              />
              <button
                onClick={handleIndexProduct}
                disabled={indexLoading}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] text-[12px] font-medium rounded-lg hover:bg-[var(--surface3)] hover:text-[var(--fg)] disabled:opacity-50 transition"
              >
                <Upload className="w-3.5 h-3.5" /> {indexLoading ? "…" : t.knowledge.indexOne}
              </button>
            </div>
          </div>

          <button onClick={handleReindex} disabled={reindexing} className="w-full h-9 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-50 transition flex items-center justify-center gap-2">
            <RotateCcw className={`w-3.5 h-3.5 ${reindexing ? "animate-spin" : ""}`} /> {reindexing ? t.vectorDb.reindexing : t.vectorDb.reindex}
          </button>
        </div>
      </div>

      {/* 向量检索演示 */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2 mb-4">
          <Sparkles className="w-[18px] h-[18px]" strokeWidth={2} /> {t.vectorDb.searchTitle}
        </h3>
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t.vectorDb.searchPlaceholder}
            className="flex-1 h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
          />
          <button onClick={handleSearch} disabled={searching} className="inline-flex items-center gap-2 h-10 px-5 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-50 transition">
            <Search className="w-4 h-4" /> {searching ? t.vectorDb.searching : t.vectorDb.search}
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-center text-[13px] text-[var(--sub)] py-8">{t.vectorDb.noResults}</p>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div key={result.id} className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--surface3)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-[var(--infobg)] text-[#0071e3] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                    <p className="text-[13px] text-[var(--fg)] font-medium truncate">{result.title}</p>
                  </div>
                  <span className="text-[12px] font-semibold flex-shrink-0 ml-3" style={{ color: result.similarity > 0.3 ? "#30d158" : "var(--muted)" }}>
                    {t.vectorDb.similarity} {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(result.similarity * 100)}%`,
                      background: result.similarity > 0.3
                        ? "linear-gradient(90deg, #0071e3, #30d158)"
                        : "linear-gradient(90deg, #333, var(--sub))",
                    }}
                  />
                </div>
                <p className="text-[12px] text-[var(--muted)] line-clamp-2">{result.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 知识库：AI 问答 + 写入向量库 */}
      <div>
        <h2 className="text-[18px] font-bold text-[var(--fg)] flex items-center gap-2 mb-4">
          <BookOpen className="w-[20px] h-[20px]" strokeWidth={2} /> {t.knowledge.title}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* AI 问答 */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2 mb-4">
              <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2} /> {t.knowledge.searchBtn}知识库
            </h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={kbQuery}
                onChange={(e) => setKbQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKbSearch()}
                placeholder={t.knowledge.search}
                className="flex-1 h-10 px-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] transition"
              />
              <button
                onClick={handleKbSearch}
                disabled={kbLoading}
                className="inline-flex items-center gap-2 h-10 px-5 bg-[var(--fg)] text-[var(--bg)] text-[13px] font-semibold rounded-full hover:bg-[var(--surface3)] disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" /> {kbLoading ? t.knowledge.searching : t.knowledge.searchBtn}
              </button>
            </div>
            {answer && (
              <div className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--border)]">
                <h4 className="text-[12px] font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">{t.knowledge.aiAnswer}</h4>
                <p className="text-[13px] text-[var(--fg)] leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>
            )}
            {sources.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[11px] font-semibold text-[var(--sub)] mb-2 uppercase tracking-wider">{t.knowledge.sources}</h4>
                {sources.map((s: any) => (
                  <div key={s.id} className="text-[12px] text-[var(--muted)] border-b border-[var(--surface2)] py-2 flex justify-between gap-3">
                    <span className="truncate">{s.title}</span>
                    <span className="text-[var(--fg)] font-medium flex-shrink-0">{t.knowledge.similarity}: {(s.similarity * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 写入向量库 */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--fg)] flex items-center gap-2">
                <FilePlus2 className="w-[18px] h-[18px]" strokeWidth={2} /> 写入向量库
              </h3>
              <button onClick={loadEntries} className="p-1.5 rounded-lg text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[var(--surface2)] transition" title="刷新">
                <RefreshCw className={`w-3.5 h-3.5 ${entriesLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">标题 *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：产品使用说明 / 采购条款" className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">内容 *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} placeholder="输入要写入向量库的知识内容，AI 提问时可按相似度检索到" className="w-full px-3 py-2 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)] resize-y" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">标签</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="逗号分隔" className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] placeholder:text-[var(--sub)] focus:outline-none focus:border-[var(--sub)]" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">语言</label>
                  <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)]">
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                    <option value="bilingual">中英双语</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[var(--sub)] uppercase tracking-wider">关联产品（可选）</label>
                  <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="w-full h-9 px-3 mt-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)]">
                    <option value="">不关联</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}（{p.sku}）</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleWrite}
                disabled={writing}
                className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-[var(--surface2)] border border-[var(--border)] text-[var(--fg)] text-[12px] font-medium rounded-lg hover:bg-[var(--surface3)] disabled:opacity-50 transition"
              >
                <Upload className="w-3.5 h-3.5" /> {writing ? "写入中…" : "写入向量库"}
              </button>
            </div>

            <div className="mt-5">
              <h4 className="text-[11px] font-semibold text-[var(--sub)] mb-2 uppercase tracking-wider">已写入条目（{entries.length}）</h4>
              {entries.length === 0 ? (
                <p className="text-[12px] text-[var(--sub)]">暂无条目，写入后将在此显示</p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {entries.map((e: any) => (
                    <div key={e.id} className="bg-[var(--surface2)] rounded-xl border border-[var(--border)] px-3 py-2.5">
                      {editingId === e.id ? (
                        <div className="space-y-2">
                          <input type="text" value={editForm.title} onChange={(ev) => setEditForm({ ...editForm, title: ev.target.value })} placeholder="标题 *" className="w-full h-8 px-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)]" />
                          <textarea value={editForm.content} onChange={(ev) => setEditForm({ ...editForm, content: ev.target.value })} rows={4} placeholder="内容 *" className="w-full px-2.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)] resize-y" />
                          <div className="flex gap-2">
                            <input type="text" value={editForm.tags} onChange={(ev) => setEditForm({ ...editForm, tags: ev.target.value })} placeholder="标签（逗号分隔）" className="flex-1 h-8 px-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none focus:border-[var(--sub)]" />
                            <select value={editForm.language} onChange={(ev) => setEditForm({ ...editForm, language: ev.target.value })} className="h-8 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] text-[var(--fg)] focus:outline-none">
                              <option value="zh">中文</option>
                              <option value="en">English</option>
                              <option value="bilingual">中英双语</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleEditSave} disabled={savingEdit} className="h-8 px-3 bg-[var(--fg)] text-[var(--bg)] text-[12px] font-semibold rounded-lg hover:bg-[var(--surface3)] disabled:opacity-50 transition">
                              {savingEdit ? "保存中…" : "保存"}
                            </button>
                            <button onClick={() => setEditingId(null)} className="h-8 px-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] text-[12px] rounded-lg hover:text-[var(--fg)] transition">
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[12px] text-[var(--fg)] font-medium truncate">{e.title}</p>
                            <p className="text-[11px] text-[var(--sub)] mt-0.5">
                              {e.language === "en" ? "EN" : e.language === "bilingual" ? "中英" : "中文"}
                              {e.productName && ` · ${e.productName}`}
                              {e.tags && ` · ${e.tags}`}
                              {" · "}{new Date(e.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(e)} className="p-1 rounded text-[var(--sub)] hover:text-[var(--fg)] hover:bg-[var(--surface)] transition" title="编辑">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteEntry(e.id)} className="p-1 rounded text-[var(--sub)] hover:text-[var(--err)] hover:bg-[var(--surface)] transition" title="删除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}