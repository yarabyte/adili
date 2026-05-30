const SAMPLING_RATES: Record<string, number> = {
  page_view: 1,
  scroll_depth: 0.3,
  click_cta: 1,
  ai_call: 1,
};

export function shouldSample(eventName: string): boolean {
  if (process.env.ANALYTICS_SAMPLING_ENABLED !== "true") return true;
  const rate = SAMPLING_RATES[eventName] ?? 1;
  return Math.random() < rate;
}

export function isAnalyticsEnabled(): boolean {
  return process.env.ANALYTICS_ENABLED !== "false";
}
