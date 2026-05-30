const BOT_PATTERNS = [
  /bot|crawler|spider|scraper/i,
  /googlebot|bingbot|yandex|baidu/i,
  /headless|phantom|selenium/i,
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((p) => p.test(userAgent));
}
