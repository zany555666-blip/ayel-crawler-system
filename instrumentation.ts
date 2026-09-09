export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __emailSchedulerStarted?: boolean };
  if (g.__emailSchedulerStarted) return;
  g.__emailSchedulerStarted = true;

  const { maybeRunDueCampaigns } = await import("@/lib/email/scheduler");
  const { processPendingEnrichment } = await import("@/lib/email/auto-enqueue");

  const tick = async () => {
    try {
      await maybeRunDueCampaigns();
    } catch {
      // 单次调度失败静默，下轮重试
    }
    try {
      await processPendingEnrichment(2);
    } catch {
      // 补全失败静默，下轮重试
    }
  };

  setInterval(tick, 60_000);
  setTimeout(tick, 10_000);
}