/**
 * Diagnostic DATABASE_URL : hôte extrait (sans mot de passe) + résolution DNS.
 * Usage : npm run db:check-host
 */
import path from "path";
import { config } from "dotenv";

import { resolveHostnameRecords } from "../lib/net/dns-host";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

function redactedDatabaseUrl(connectionUrl: string): string {
  try {
    const normalized = connectionUrl.replace(/^postgres:\/\//i, "postgresql://");
    const u = new URL(normalized);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(URL non analysable par URL(), vérifiez les caractères spéciaux dans le mot de passe — encoder ou utiliser des guillemets.)";
  }
}

function hostnameFromDatabaseUrl(connectionUrl: string): string {
  const normalized = connectionUrl.replace(/^postgres:\/\//i, "postgresql://");
  const u = new URL(normalized);
  return u.hostname;
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !raw.trim()) {
    console.error("DATABASE_URL est vide ou absent après chargement .env / .env.local.");
    process.exitCode = 1;
    return;
  }

  const url = raw.trim();
  const len = url.length;
  const first = url[0];
  const last = url[len - 1];
  const hasOuterQuotes =
    (first === '"' && last === '"') || (first === "'" && last === "'");

  console.log("— Contrôle basique —");
  console.log("Longueur (caractères) :", len);
  console.log(
    "Espaces en tête / fin :",
    raw !== url ? "oui (corrigé avec .trim() pour l’analyse)" : "non"
  );
  console.log(
    "Guillemets englobants dans la valeur brute :",
    hasOuterQuotes
      ? "possible doublon si vous avez aussi quoté dans .env — une seule paire de quotes autour de toute l’URL, ou aucune."
      : "non détecté sur le premier/dernier caractère"
  );

  let host: string;
  try {
    host = hostnameFromDatabaseUrl(url);
  } catch {
    console.error("\nImpossible d’extraire l’hôte. URL masquée :");
    console.error(redactedDatabaseUrl(url));
    process.exitCode = 1;
    return;
  }

  console.log("\n— Hôte utilisé pour le DNS —");
  console.log(host);
  console.log("\n— URL (mot de passe masqué) —");
  console.log(redactedDatabaseUrl(url));

  console.log("\n— Résolution DNS (A / AAAA) —");
  try {
    const { ipv4, ipv6 } = await resolveHostnameRecords(host);
    if (ipv4.length === 0 && ipv6.length === 0) {
      console.error("Aucun enregistrement A ni AAAA.");
      process.exitCode = 1;
    } else {
      if (ipv4.length) console.log("IPv4 (A) :", ipv4.join(", "));
      if (ipv6.length) console.log("IPv6 (AAAA) :", ipv6.join(", "));
      if (ipv4.length === 0 && ipv6.length > 0) {
        console.warn(`
⚠️  IPv6 seulement : Node / « postgres » peuvent encore répondre ENOTFOUND. Utilisez l’URI **Session pooler** (…pooler.supabase.com:5432) depuis le dashboard.`);
      }
    }
  } catch (e) {
    console.error("Échec résolution :", e);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
