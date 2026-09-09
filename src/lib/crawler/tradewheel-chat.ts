import "server-only";
import { getHeadlessBrowser, USER_AGENT } from "@/lib/crawler/headless";

export interface ContactQuoteParams {
  detailUrl: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

export interface ChatSendResult {
  success: boolean;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 通过买家详情页的 "Register to Contact" 弹窗（POST /ajax/rfq-quote）发送站内询盘回复
export async function sendTradeWheelContactQuote(params: ContactQuoteParams): Promise<ChatSendResult> {
  const browser = await getHeadlessBrowser(undefined, true);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });
    await page.goto(params.detailUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await sleep(3000);

    // 1) 点击 CONTACT BUYER（displayRfqQuotePopoup）
    const clicked = await page.evaluate((buyerId) => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const target = anchors.find((a) =>
        (a.getAttribute("href") || "").includes(`displayRfqQuotePopoup(${buyerId}`)
      );
      if (!target) return false;
      try {
        (target as HTMLElement).click();
      } catch {
        // 页面脚本自身的未捕获异常不影响弹窗打开
      }
      return true;
    }, params.detailUrl.match(/(\d+)\/?$/)?.[1] || "");
    if (!clicked) return { success: false, error: "未找到 CONTACT BUYER 入口" };
    await sleep(2500);

    // 2) 定位弹窗（可见的 .modal）
    const modalVisible = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll(".modal"));
      const visible = modals.find((m) => window.getComputedStyle(m).display !== "none");
      if (!visible) return false;
      (visible as HTMLElement).setAttribute("data-ready", "1");
      return true;
    });
    if (!modalVisible) return { success: false, error: "联系弹窗未出现" };

    // 3) 填写表单
    const fill = (selector: string, value: string) => page.$eval(selector, (el, v) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(input, v);
      else input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, value).catch(() => undefined);

    await page.evaluate((params) => {
      try {
        const modal = Array.from(document.querySelectorAll(".modal")).find((m) => window.getComputedStyle(m).display !== "none") as HTMLElement;
        if (!modal) return;
        const scope = (sel: string, value: string) => {
          try {
            const el = modal.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
            if (!el) return;
            const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (setter) setter.call(el, value);
            else el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } catch {
            // 单字段填表失败不影响其他字段
          }
        };
        scope('input[name="name"]', params.name);
        scope('input[name="email"]', params.email);
        scope('input[name="phone_number"]', params.phone);
        scope('input[name="company_name"]', params.company);
        scope('textarea[name="message"]', params.message);
        try {
          const agree = modal.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
          if (agree && !agree.checked) agree.click();
        } catch {
          try {
            const agree = modal.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (agree) agree.checked = true;
          } catch {
            // 忽略
          }
        }
      } catch {
        // 填表整体失败不阻断后续提交步骤
      }
    }, params);

    await sleep(800);

    // 4) 提交 SEND MESSAGE
    await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll(".modal")).find((m) => window.getComputedStyle(m).display !== "none") as HTMLElement;
      if (!modal) return;
      const btn = Array.from(modal.querySelectorAll("button")).find(
        (b) => (b.textContent || "").trim().toUpperCase().includes("SEND MESSAGE") || b.type === "submit"
      ) as HTMLButtonElement | null;
      if (btn) {
        try {
          btn.click();
        } catch {
          // 页面脚本异常不影响提交
        }
      }
    });
    await sleep(5000);

    // 5) 验证：弹窗关闭 / 出现成功提示 / 页面 toast
    const state = await page.evaluate(() => {
      const modalOpen = Array.from(document.querySelectorAll(".modal")).some((m) => window.getComputedStyle(m).display !== "none");
      const toast = Array.from(document.querySelectorAll(".jq-toast-single, .toast, [class*='success']")).map((t) => (t.textContent || "").trim().slice(0, 120)).filter(Boolean);
      return { modalOpen, toast };
    });
    const toastOk = state.toast.some((t) => /success|sent|thank|received|submitted|done/i.test(t));
    const success = !state.modalOpen || toastOk;

    return success
      ? { success: true }
      : { success: false, error: `提交后未确认成功（弹窗仍打开）${state.toast[0] ? `：${state.toast[0]}` : ""}` };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "平台发送失败" };
  } finally {
    await page.close().catch(() => undefined);
  }
}