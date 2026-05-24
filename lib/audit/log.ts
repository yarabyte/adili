import "server-only";

import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import {
  ALL_AUDIT_ACTIONS,
  type AuditAction,
} from "@/lib/constants/audit-actions";

/**
 * Trace une action dans `audit_log` de façon fire-and-forget : si l'écriture
 * échoue, on log l'erreur côté serveur mais on ne casse pas le flux métier.
 * Le `action` doit suivre la forme `entity.verbe` (cf. AUDIT_ACTIONS).
 */
export async function logAction(opts: {
  action: AuditAction;
  cabinetId: string;
  userId?: string | null;
  affaireId?: string | null;
  documentId?: string | null;
  compteRenduId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  if (!ALL_AUDIT_ACTIONS.includes(opts.action)) {
    console.warn(`[audit] action inconnue ignorée : ${opts.action}`);
    return;
  }

  try {
    await db.insert(auditLog).values({
      action: opts.action,
      cabinetId: opts.cabinetId,
      userId: opts.userId ?? null,
      affaireId: opts.affaireId ?? null,
      documentId: opts.documentId ?? null,
      compteRenduId: opts.compteRenduId ?? null,
      metadata: opts.metadata ?? null,
    });
  } catch (err) {
    // Observabilité best-effort : on n'interrompt jamais le flux métier.
    console.error("[audit] insertion échouée :", err);
  }
}
