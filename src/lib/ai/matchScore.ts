export interface MatchScores {
  fit: number;
  intent: number;
  trust: number;
  reach: number;
  potential: number;
  total: number;
  reachNote?: string;
  trustEstimated: boolean;
}

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

// 平台隐藏了邮箱/电话但支持站内询盘的来源
const PLATFORM_INQUIRY = /tradewheel|made-in-china|alibaba|globalsources|ec21|tradeindia|indiamart|ecplaza|go4worldbusiness/i;

export function computeMatchScores(input: {
  demand?: { fitScore?: number; intentScore?: number; potentialScore?: number } | null;
  email?: string;
  phone?: string;
  whatsapp?: string;
  source?: string;
  trustScore?: number;
}): MatchScores {
  const fit = clamp(input.demand?.fitScore ?? 50);
  const intent = clamp(input.demand?.intentScore ?? 50);
  const potential = clamp(input.demand?.potentialScore ?? 50);
  const trustEstimated = input.trustScore === undefined;
  const trust = clamp(input.trustScore ?? 55);

  let reach: number;
  let reachNote: string | undefined;
  if (input.email || input.phone || input.whatsapp) {
    reach = 100;
  } else if (input.source && PLATFORM_INQUIRY.test(input.source)) {
    reach = 65;
    reachNote = "平台隐藏联系方式，可通过平台询盘联系";
  } else {
    reach = 0;
    reachNote = "无联系方式，无法触达";
  }

  const total = Math.round(0.4 * fit + 0.25 * intent + 0.1 * trust + 0.15 * reach + 0.1 * potential);

  return { fit, intent, trust, reach, potential, total, reachNote, trustEstimated };
}