export function anonymizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return "0.0.0.0";

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    return `${parts.slice(0, 4).join(":")}::0`;
  }

  const parts = trimmed.split(".");
  if (parts.length !== 4) return trimmed;
  parts[3] = "0";
  return parts.join(".");
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";
  return req.headers.get("x-real-ip")?.trim() ?? "0.0.0.0";
}
