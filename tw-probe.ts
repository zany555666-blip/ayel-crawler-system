import { fetchHtml } from "./src/lib/crawler";
import * as cheerio from "cheerio";

(async () => {
  const url = "https://www.exportersindia.com/buyers/labels.htm";
  const html = await fetchHtml(url, {}, 1);
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ").trim();
  console.log("body len:", text.length);
  const idx = text.indexOf("RFQs");
  console.log("=== 列表文本 ===");
  console.log(text.slice(idx > 0 ? idx : 0, idx > 0 ? idx + 2000 : 2000));
  console.log("\n=== 含 @ 邮箱 ===");
  const emails = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  console.log([...new Set(emails)].slice(0, 10));
  process.exit(0);
})();