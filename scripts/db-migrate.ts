import path from "path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { resolveHostnameRecords } from "../lib/net/dns-host";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

function hostnameFromDatabaseUrl(connectionUrl: string): string {
  const normalized = connectionUrl.replace(/^postgres:\/\//i, "postgresql://");
  try {
    return new URL(normalized).hostname;
  } catch {
    throw new Error(
      "DATABASE_URL illisible (attendu : postgres://… ou postgresql://… avec hôte, port et base)."
    );
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquant (.env.local).");
  }

  const host = hostnameFromDatabaseUrl(url);
  const { ipv4, ipv6 } = await resolveHostnameRecords(host);
  if (ipv4.length === 0 && ipv6.length === 0) {
    console.error(`
DNS : aucun enregistrement A ni AAAA pour « ${host} ».

→ Vérifiez le **Reference ID** du projet (Supabase → Settings → General) et l’URI (Settings → Database).
→ Mot de passe avec caractères spéciaux : encoder dans l’URL (ex. @ → %40).
`);
    process.exitCode = 1;
    return;
  }
  if (ipv4.length === 0 && ipv6.length > 0) {
    console.warn(`
⚠️  « ${host} » n’a que de l’IPv6 (AAAA). Avec Node / le client « postgres », la connexion peut encore échouer (ENOTFOUND).

→ Préférez l’URI **Session pooler** (Supabase → Connect → « Session pooler » / port 5432, hôte …pooler.supabase.com) : elle expose en général de l’IPv4 et les migrations DDL passent mieux.
`);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    console.log("Migrations appliquées.");
  } catch (err) {
    const cause =
      err &&
      typeof err === "object" &&
      "cause" in err &&
      err.cause &&
      typeof err.cause === "object" &&
      "code" in err.cause
        ? (err.cause as NodeJS.ErrnoException).code
        : "";
    if (cause === "ENOTFOUND") {
      console.error(`
Connexion : ENOTFOUND vers « ${host} » (souvent avec \`db.*.supabase.co\` **IPv6-only** + résolution Node).

→ Utilisez l’URI **Session pooler** depuis Supabase (hôte \`*.pooler.supabase.com\`, port **5432**, mode session — pas le mode « Transaction » 6543 pour les migrations).

→ Ou vérifiez la connectivité IPv6 / DNS (VPN, FAI).
`);
      process.exitCode = 1;
      return;
    }
    throw err;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
