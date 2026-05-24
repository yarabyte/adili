export type QuotaVia = "quota_mensuel" | "pack" | "depassement_gratuit";

export type QuotaCheckResult =
  | {
      ok: true;
      restant: number;
      via: QuotaVia;
      packId?: string;
      quotaMensuel: number;
      consomme: number;
    }
  | {
      ok: false;
      raison: "quota_epuise_pack_requis" | "subscription_expired";
      details: {
        quota_mensuel?: number;
        consomme?: number;
        reset_date?: string;
        pack_url?: string;
        billing_url?: string;
      };
    };

export type QuotaSummary = {
  quotaMensuel: number;
  consomme: number;
  restantMensuel: number;
  packRestant: number;
  depassementGratuitUtilise: boolean;
  periodeFin: string;
  planNom: string;
  planId: string;
  subscriptionStatut: string;
};
