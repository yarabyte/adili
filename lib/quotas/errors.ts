import type { QuotaCheckResult } from "./types";

export class QuotaExceededError extends Error {
  readonly details: Extract<QuotaCheckResult, { ok: false }>["details"];
  readonly raison: Extract<QuotaCheckResult, { ok: false }>["raison"];

  constructor(result: Extract<QuotaCheckResult, { ok: false }>) {
    super(
      result.raison === "subscription_expired"
        ? "Votre abonnement n'est pas actif."
        : "Quota IA épuisé pour ce mois."
    );
    this.name = "QuotaExceededError";
    this.details = result.details;
    this.raison = result.raison;
  }
}
