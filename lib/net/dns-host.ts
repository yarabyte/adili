import dns from "node:dns/promises";

export type HostDnsRecords = { ipv4: string[]; ipv6: string[] };

/** Résolution DNS réelle (A / AAAA). `dns.lookup` peut renvoyer ENOTFOUND pour un hôte IPv6-only. */
export async function resolveHostnameRecords(
  hostname: string
): Promise<HostDnsRecords> {
  const [r4, r6] = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
  ]);
  return {
    ipv4: r4.status === "fulfilled" ? r4.value : [],
    ipv6: r6.status === "fulfilled" ? r6.value : [],
  };
}
