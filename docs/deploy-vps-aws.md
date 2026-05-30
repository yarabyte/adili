# Déploiement Adili sur VPS AWS

Guide pour héberger l’application Next.js sur un VPS (EC2 Ubuntu ou équivalent). La base de données, l’auth et le stockage fichiers restent sur **Supabase** ; le VPS exécute uniquement l’app Node.

## Architecture

```
Internet
    │
    ▼
[Nginx :443] ──► [Next.js :3000] ──┬──► Supabase (Postgres 6543, Auth, Storage)
    │                              ├──► Anthropic API (synthèse)
    │                              ├──► Voyage API (embeddings recherche)
    │                              ├──► SMTP (emails)
    │                              └──► CinetPay (paiement, webhook entrant)
    │
[cron système] ──GET + Bearer CRON_SECRET──► /api/cron/*
```

## Prérequis serveur

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| vCPU | 2 | 2+ |
| RAM | 2 Go | **4 Go** (Puppeteer / PDF) |
| Disque | 20 Go | 40 Go |
| OS | Ubuntu 22.04 ou 24.04 LTS | |
| Node.js | **20 LTS** | `nvm` ou NodeSource |
| Nom de domaine | DNS A → IP Elastic du VPS | |

Ports ouverts : **22** (SSH), **80**, **443**. Ne pas exposer Postgres publiquement (reste chez Supabase).

---

## 1. Préparation du VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx certbot python3-certbot-nginx

# Node 20 (exemple NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

### Chromium pour les exports PDF (Puppeteer)

Les routes `/api/documents/.../pdf` et `/api/comptes-rendus/.../pdf` lancent Chromium headless.

```bash
# Dépendances courantes Ubuntu (Puppeteer peut aussi utiliser son Chromium embarqué)
sudo apt install -y \
  chromium-browser \
  fonts-liberation \
  libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libcups2t64 \
  libdrm2 libgbm1 libgtk-3-0t64 libnss3 libxcomposite1 libxdamage1 \
  libxfixes3 libxkbcommon0 libxrandr2
```

Sur une instance **t2.small** (2 Go RAM), surveiller la mémoire lors d’un export PDF simultané.

### Utilisateur dédié (recommandé)

```bash
sudo useradd -r -m -d /var/www/adili -s /bin/bash adili
sudo mkdir -p /var/www/adili
sudo chown adili:adili /var/www/adili
```

---

## 2. Installation de l’application

```bash
sudo -u adili -i
cd /var/www/adili

git clone https://github.com/VOTRE_ORG/adili.git .
# ou déployer via CI/rsync

npm ci
cp .env.example .env
nano .env   # remplir toutes les variables (voir section 3)
npm run build
```

Test manuel :

```bash
NODE_ENV=production npm run start
# Écouter sur http://127.0.0.1:3000 puis Ctrl+C
```

---

## 3. Variables d’environnement (`.env`)

Fichier `/var/www/adili/.env` — **ne jamais committer**.

### Obligatoires

```env
# Postgres — pooler TRANSACTION port 6543 pour Next.js en prod
DATABASE_URL=postgresql://postgres.[ref]:[MOT_DE_PASSE_ENCODE]@aws-0-[region].pooler.supabase.com:6543/postgres

NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_SITE_URL=https://adili.cloud

# Google Tag Manager ou GA4 — /app et /admin exclus des pageviews SPA
# NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...

SMTP_HOST=mail.privateemail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@adili.cloud
SMTP_PASS=...
SMTP_FROM="Adili <support@adili.cloud>"

# Secret long (openssl rand -hex 32) — crons HTTP
CRON_SECRET=
```

### Production recommandées

```env
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
# Par défaut : {NEXT_PUBLIC_SITE_URL}/api/billing/payments/mobile-money/webhook
# CINETPAY_NOTIFY_URL=https://adili.cloud/api/billing/payments/mobile-money/webhook
# CINETPAY_RETURN_URL=https://adili.cloud/app/billing?paiement=ok
```

### Migrations (une fois, depuis le VPS ou en local)

Utiliser l’URI **directe** Supabase (`db.[ref].supabase.co:5432`) ou le pooler **session** pour le DDL — **pas** le pooler transaction 6543.

```bash
npm run db:migrate
# puis les scripts SQL listés dans package.json si besoin (db:billing, db:affaires, …)
```

Ingestion corpus (manuel, long) :

```bash
npm run ingest:actes
npm run ingest:national
```

---

## 4. Supabase (dashboard)

1. **Authentication → URL Configuration**  
   - Site URL : `https://adili.cloud`  
   - Redirect URLs : `https://adili.cloud/auth/callback`, `https://adili.cloud/auth/confirm`

2. **Database → Extensions** : activer `vector` (pgvector).

3. **Storage** : buckets privés pour factures, paiements, étudiants (selon migrations).

4. **SMTP Auth** (optionnel) : configurer si les emails de connexion passent par Supabase plutôt que uniquement SMTP applicatif.

---

## 5. Service systemd

Fichier `/etc/systemd/system/adili.service` :

```ini
[Unit]
Description=Adili Next.js application
After=network.target

[Service]
Type=simple
User=adili
Group=adili
WorkingDirectory=/var/www/adili
Environment=NODE_ENV=production
EnvironmentFile=/var/www/adili/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10
# Limite mémoire optionnelle (ajuster selon instance)
# MemoryMax=3G

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable adili
sudo systemctl start adili
sudo systemctl status adili
journalctl -u adili -f
```

L’app écoute par défaut sur le port **3000** (`next start`).

---

## 6. Nginx (reverse proxy + TLS)

Fichier `/etc/nginx/sites-available/adili` :

```nginx
upstream adili_next {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name adili.cloud www.adili.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name adili.cloud www.adili.cloud;

    # Certbot remplira ces lignes :
    ssl_certificate     /etc/letsencrypt/live/adili.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/adili.cloud/privkey.pem;

    client_max_body_size 25M;

    location / {
        proxy_pass http://adili_next;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Synthèse IA en flux SSE — timeouts plus longs
    location /api/search/synthesize {
        proxy_pass http://adili_next;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/adili /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d adili.cloud -d www.adili.cloud
sudo systemctl reload nginx
```

---

## 7. Crons applicatifs (obligatoire en prod)

Adili expose **3 routes HTTP** protégées par `Authorization: Bearer <CRON_SECRET>`.  
Il n’y a **pas** de scheduler intégré : configurer **cron** sur le VPS (ou EventBridge + curl depuis une Lambda si vous préférez).

| Route | Rôle | Fréquence suggérée |
|-------|------|-------------------|
| `GET /api/cron/reset-quotas` | Initialise les quotas IA du mois (fuseau **Africa/Douala**) | **1×/mois** — 1er à 00:05 |
| `GET /api/cron/expire-packs` | Expire les packs additionnels dépassés | **1×/jour** — 02:00 |
| `GET /api/cron/quota-alerts` | E-mail si ≥ 80 % du quota IA | **1×/jour** — 08:00 |

### Script d’appel

Fichier `/var/www/adili/scripts/cron-call.sh` :

```bash
#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${1:?Usage: cron-call.sh <path> e.g. /api/cron/reset-quotas}"
ENV_FILE="/var/www/adili/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET manquant dans .env}"
: "${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL manquant dans .env}"

URL="${NEXT_PUBLIC_SITE_URL%/}${ENDPOINT}"
curl -fsS --max-time 120 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "$URL"
echo ""
```

```bash
chmod +x /var/www/adili/scripts/cron-call.sh
chown adili:adili /var/www/adili/scripts/cron-call.sh
```

Test manuel :

```bash
sudo -u adili /var/www/adili/scripts/cron-call.sh /api/cron/expire-packs
```

### Crontab (utilisateur `adili` ou root)

```bash
sudo crontab -u adili -e
```

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# Quotas mensuels (1er du mois, 00:05 UTC — ajuster TZ si le serveur n'est pas en UTC)
5 0 1 * * /var/www/adili/scripts/cron-call.sh /api/cron/reset-quotas >> /var/log/adili-cron.log 2>&1

# Packs expirés
0 2 * * * /var/www/adili/scripts/cron-call.sh /api/cron/expire-packs >> /var/log/adili-cron.log 2>&1

# Alertes quota 80 %
0 8 * * * /var/www/adili/scripts/cron-call.sh /api/cron/quota-alerts >> /var/log/adili-cron.log 2>&1
```

```bash
sudo touch /var/log/adili-cron.log
sudo chown adili:adili /var/log/adili-cron.log
```

> **Note fuseau** : `reset-quotas` calcule la période en `Africa/Douala` côté application. Le cron peut rester en UTC ; l’important est de l’exécuter le **1er du mois** après minuit Douala (ex. 1er à 00:05 UTC = 01:05 Douala en heure d’hiver).

---

## 8. Webhooks entrants (hors cron)

| Méthode | URL | Source |
|---------|-----|--------|
| POST | `/api/billing/payments/mobile-money/webhook` | CinetPay |

Configurer dans le dashboard CinetPay l’URL :

`https://adili.cloud/api/billing/payments/mobile-money/webhook`

Le VPS doit être joignable en HTTPS depuis Internet.

---

## 9. Mise à jour (déploiement)

```bash
sudo -u adili -i
cd /var/www/adili
git pull
npm ci
npm run build
exit
sudo systemctl restart adili
```

---

## 10. Checklist de validation

- [ ] `https://adili.cloud` charge la page d’accueil
- [ ] Connexion / inscription Supabase OK
- [ ] Recherche corpus (`/recherche` ou `/app`) retourne des résultats
- [ ] Export PDF d’un document (Chromium OK)
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" "$SITE/api/cron/expire-packs"` → JSON `{ "expired": N }`
- [ ] E-mail SMTP (invitation ou alerte quota test)
- [ ] Webhook CinetPay test (sandbox) si facturation active
- [ ] `journalctl -u adili` sans erreur `DATABASE_URL` / pool saturé

---

## 11. Dépannage

| Symptôme | Piste |
|----------|--------|
| `CRON_SECRET non configuré` (503) | Définir `CRON_SECRET` dans `.env` et redémarrer systemd |
| `Non autorisé` (401) cron | Vérifier l’en-tête `Authorization: Bearer ...` |
| PDF échoue | Chromium / RAM ; logs `journalctl -u adili` |
| Trop de connexions Postgres | `DATABASE_URL` doit utiliser le pooler **6543**, pas 5432 session |
| Migrations échouent | Utiliser URI directe `:5432` pour `npm run db:*`, pas 6543 |
| OAuth redirect invalide | URLs dans Supabase Auth = `NEXT_PUBLIC_SITE_URL` |
| Synthèse coupée | Augmenter `proxy_read_timeout` sur `/api/search/synthesize` |
| `Can't resolve '@tremor/react'` ou `'swr'` au build | Après `git pull`, exécuter **`npm ci`** (pas seulement `npm run build`). Vérifier que `package-lock.json` est à jour (`git log -1 package.json`). |

---

## 12. Sécurité AWS (rappels)

- Groupe de sécurité EC2 : 80/443 depuis `0.0.0.0/0`, SSH restreint à votre IP
- Clés `.env` en `chmod 600`, propriétaire `adili`
- Sauvegardes : Supabase gère Postgres ; sauvegarder le repo et les secrets (AWS Secrets Manager ou SSM Parameter Store en option)
- Mettre à jour le OS et Node régulièrement

---

## Référence code

- Auth cron : `lib/cron/auth.ts`
- Routes : `app/api/cron/reset-quotas`, `expire-packs`, `quota-alerts`
- PDF : `lib/documents/pdf/generate-pdf.ts`
- Variables : `.env.example`
