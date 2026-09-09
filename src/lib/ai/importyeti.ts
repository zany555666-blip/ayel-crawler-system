import { fetchRenderedHtmlWithVerify, closeHeadlessBrowser, DEFAULT_BROWSER_ID } from "@/lib/crawler/headless";

export interface YetiSupplier {
  name: string;
  country: string;
  address?: string;
  totalShipments?: number;
  percent?: number;
  shipments12m?: number;
}

export interface YetiCompanyData {
  found: boolean;
  companyName?: string;
  suppliers: YetiSupplier[];
  topCustomers: { name: string; shipments12m?: number; total?: number }[];
  url: string;
}

function extractJsonSection(flat: string, key: string, open: "[" | "{", close: "]" | "}"): string | null {
  const idx = flat.indexOf(`"${key}"`);
  if (idx < 0) return null;
  const start = flat.indexOf(open, idx);
  if (start < 0 || start - idx > 400) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < flat.length; i += 1) {
    const ch = flat[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') {
      inStr = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) return flat.slice(start, i + 1);
    }
  }
  return null;
}

export async function fetchImportYetiData(companyName: string): Promise<YetiCompanyData> {
  const url = `https://www.importyeti.com/search?q=${encodeURIComponent(companyName)}`;
  const result: YetiCompanyData = { found: false, suppliers: [], topCustomers: [], url };
  try {
    let html = "";
    // ImportYeti 偶发网络失败/验证挑战，重试 2 次
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        html = await fetchRenderedHtmlWithVerify(url, DEFAULT_BROWSER_ID, true, 30_000, 25_000);
        if (!/请检查你的网络|网络电缆|无法访问|ERR_/i.test(html.replace(/<[^>]+>/g, " ").slice(0, 3000))) break;
      } catch {
        // 重试
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    const flat = html
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#x27;|&#39;/g, "'");

    const suppliersRaw = extractJsonSection(flat, "suppliers_table", "[", "]");
    if (suppliersRaw) {
      try {
        const rows = JSON.parse(suppliersRaw);
        if (Array.isArray(rows)) {
          result.found = true;
          for (const row of rows) {
            const supplier: YetiSupplier = {
              name: String(row.supplier_name || ""),
              country: String(row.country || row.supplier_address_country || ""),
              address: String(row.supplier_address || ""),
              totalShipments: Number(row.total_shipments_supplier) || undefined,
              percent: Number(row.shipments_percents_supplier) || undefined,
              shipments12m: Number(row.shipments_12m) || undefined,
            };
            if (supplier.name) result.suppliers.push(supplier);
            if (Array.isArray(row.top_companies)) {
              for (const tc of row.top_companies) {
                const name = String(tc.company_name || "");
                if (name && !result.topCustomers.some((c) => c.name === name)) {
                  result.topCustomers.push({
                    name,
                    shipments12m: Number(tc.shipments_12m) || undefined,
                    total: Number(tc.total_shipments) || undefined,
                  });
                }
              }
            }
          }
        }
      } catch {
        // 解析失败忽略
      }
    }
  } catch {
    // 渲染失败（403/超时）返回未命中
  } finally {
    await closeHeadlessBrowser().catch(() => undefined);
  }
  return result;
}
