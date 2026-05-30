This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Analytics (maison intégrée)

Collecte souveraine dans PostgreSQL + dashboard `/admin/analytics` (Tremor, polling 30 s, live Supabase Realtime).

```bash
npm run db:analytics
```

Variables : `ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_ANALYTICS_ENABLED=true`.

Crons (VPS) :

```bash
./scripts/cron-call.sh /api/cron/analytics/refresh-views   # */5 * * * *
./scripts/cron-call.sh /api/cron/analytics/close-sessions   # */10 * * * *
./scripts/cron-call.sh /api/cron/analytics/cleanup-old     # 0 3 * * 0
```

Pour le live : activer Realtime sur `analytics_events` dans Supabase (Database → Replication).

## Déploiement production (VPS AWS)

Guide complet : [docs/deploy-vps-aws.md](docs/deploy-vps-aws.md) (Nginx, systemd, crons, variables d’environnement).

Crons HTTP (à planifier sur le serveur) :

```bash
./scripts/cron-call.sh /api/cron/reset-quotas    # 1×/mois
./scripts/cron-call.sh /api/cron/expire-packs    # 1×/jour
./scripts/cron-call.sh /api/cron/quota-alerts    # 1×/jour
```
