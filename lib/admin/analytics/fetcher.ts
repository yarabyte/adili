export async function adminAnalyticsFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Analytics API ${res.status}`);
  return res.json() as Promise<T>;
}

export function analyticsUrl(path: string, period: string) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}period=${period}`;
}
