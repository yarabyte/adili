const CHECKOUT_URL = "https://api-checkout.cinetpay.com/v2/payment";

export type CinetPayInitArgs = {
  transactionId: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
};

export type CinetPayInitResult = {
  paymentUrl: string;
  paymentToken: string;
};

export function isCinetPayConfigured(): boolean {
  return Boolean(
    process.env.CINETPAY_API_KEY && process.env.CINETPAY_SITE_ID
  );
}

export async function initiateCinetPayPayment(
  args: CinetPayInitArgs
): Promise<CinetPayInitResult> {
  const apikey = process.env.CINETPAY_API_KEY;
  const site_id = process.env.CINETPAY_SITE_ID;
  if (!apikey || !site_id) {
    throw new Error("CinetPay non configuré");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey,
      site_id,
      transaction_id: args.transactionId,
      amount: args.amount,
      currency: "XAF",
      description: args.description,
      customer_name: args.customerName,
      customer_email: args.customerEmail,
      customer_phone_number: args.customerPhone ?? "",
      notify_url:
        process.env.CINETPAY_NOTIFY_URL ??
        `${siteUrl}/api/billing/payments/mobile-money/webhook`,
      return_url:
        process.env.CINETPAY_RETURN_URL ??
        `${siteUrl}/app/billing?paiement=ok`,
      channels: "MOBILE_MONEY",
    }),
  });

  const data = (await res.json()) as {
    code?: string;
    message?: string;
    data?: { payment_url?: string; payment_token?: string };
  };

  if (data.code !== "201" || !data.data?.payment_url) {
    throw new Error(data.message ?? "Échec initialisation CinetPay");
  }

  return {
    paymentUrl: data.data.payment_url,
    paymentToken: data.data.payment_token ?? "",
  };
}

export function parseCinetPayWebhook(body: unknown): {
  transactionId: string;
  status: "ACCEPTED" | "REFUSED" | "PENDING" | string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const transactionId =
    (b.cpm_trans_id as string) ??
    (b.transaction_id as string) ??
    "";
  const status = (b.cpm_result as string) ?? (b.status as string) ?? "";
  if (!transactionId) return null;
  return { transactionId, status };
}
