import { desc, eq, sql } from "drizzle-orm";
import {
  Archive,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";

import { UrlListPagination } from "@/components/ui/url-list-pagination";
import { db } from "@/lib/db/client";
import { auditLog, users } from "@/lib/db/schema";
import {
  AUDIT_ACTION_LABELS,
  type AuditAction,
} from "@/lib/constants/audit-actions";
import { relativeTimeFr } from "@/lib/activity";

const HIST_PAGE_SIZE = 20;

const ICON_BY_ACTION: Record<string, typeof Briefcase> = {
  "affaire.creee": Briefcase,
  "affaire.modifiee": Edit3,
  "affaire.archivee": Archive,
  "affaire.cloturee": CheckCircle2,
  "affaire.reouverte": RotateCcw,
  "affaire.consultee": Briefcase,
  "affaire.membre_ajoute": UserPlus,
  "affaire.membre_retire": UserMinus,
  "affaire.role_change": ShieldCheck,
  "document.cree": FileText,
  "document.edite": Edit3,
  "document.sauvegarde": FileText,
  "document.soumis": Loader2,
  "document.valide": CheckCircle2,
  "document.rejete": XCircle,
  "commentaire.ajoute": MessageSquare,
  "echeance.creee": CalendarDays,
  "echeance.modifiee": CalendarDays,
  "echeance.supprimee": CalendarDays,
  "echeance.alerte_envoyee": CalendarDays,
};

function isKnownAction(s: string): s is AuditAction {
  return s in AUDIT_ACTION_LABELS;
}

export async function HistoriquePanel({
  affaireId,
  page = 1,
}: {
  affaireId: string;
  page?: number;
}) {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * HIST_PAGE_SIZE;

  const whereAffaire = eq(auditLog.affaireId, affaireId);

  const [[{ total }], rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(whereAffaire),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
        userId: auditLog.userId,
        userFullName: users.fullName,
        userEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(whereAffaire)
      .orderBy(desc(auditLog.createdAt))
      .limit(HIST_PAGE_SIZE)
      .offset(offset),
  ]);

  const totalCount = Number(total ?? 0);

  if (totalCount === 0) {
    return (
      <p className="rounded-xl border border-dashed border-brand-justice/15 bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
        Aucun événement enregistré pour cette affaire.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {rows.map((r) => {
          const Icon = ICON_BY_ACTION[r.action] ?? Briefcase;
          const label = isKnownAction(r.action)
            ? AUDIT_ACTION_LABELS[r.action]
            : r.action;
          const author = r.userFullName || r.userEmail || "Système";
          return (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-brand-justice/10 bg-card p-3 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-gold/10 text-brand-gold">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {author} · {relativeTimeFr(r.createdAt)}
                </p>
                {r.metadata != null &&
                  Object.keys(r.metadata as object).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11.5px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
                        Détails
                      </summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-brand-parchment-dark/30 p-2 text-[11px] leading-snug text-foreground/70">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
              </div>
            </li>
          );
        })}
      </ol>
      <UrlListPagination
        paramName="histPage"
        page={safePage}
        pageSize={HIST_PAGE_SIZE}
        total={totalCount}
      />
    </div>
  );
}
