import nodemailer, { type Transporter } from "nodemailer";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** HTML obligatoire si `text` absent. */
  html?: string;
  /** Texte brut pour clients qui ne rendent pas l'HTML. */
  text?: string;
  /** Reply-To (par défaut : la même que `from`). */
  replyTo?: string;
};

export type SendEmailResult = { id: string };

function envValue(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function envBool(name: string, fallback: boolean): boolean {
  const v = envValue(name);
  if (!v) return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

function envInt(name: string, fallback: number): number {
  const v = envValue(name);
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = envValue("SMTP_HOST");
  const user = envValue("SMTP_USER");
  const pass = envValue("SMTP_PASS");
  if (!host) throw new Error("SMTP_HOST manquant.");
  if (!user) throw new Error("SMTP_USER manquant.");
  if (!pass) throw new Error("SMTP_PASS manquant.");

  const port = envInt("SMTP_PORT", 465);
  // Par défaut : implicit TLS sur 465, STARTTLS sinon (587 / 25).
  const secure = envBool("SMTP_SECURE", port === 465);

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: envInt("SMTP_CONNECTION_TIMEOUT_MS", 8_000),
    greetingTimeout: envInt("SMTP_GREETING_TIMEOUT_MS", 8_000),
    socketTimeout: envInt("SMTP_SOCKET_TIMEOUT_MS", 12_000),
  });
  return cachedTransporter;
}

/**
 * Envoi transactionnel via SMTP (PrivateEmail / Namecheap, Mailgun, etc.).
 *
 * Variables requises :
 * - `SMTP_HOST`       — ex. "mail.privateemail.com"
 * - `SMTP_PORT`       — défaut 465
 * - `SMTP_SECURE`     — défaut true si port=465, false sinon (STARTTLS)
 * - `SMTP_USER`       — adresse complète, ex. "support@adili.cloud"
 * - `SMTP_PASS`       — mot de passe de la boîte
 * - `SMTP_FROM`       — ex. "Adili <support@adili.cloud>" (défaut: SMTP_USER)
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.html && !input.text) {
    throw new Error("sendEmail : au moins `html` ou `text` doit être fourni.");
  }
  const from = envValue("SMTP_FROM") ?? envValue("SMTP_USER");
  if (!from) throw new Error("SMTP_FROM ou SMTP_USER manquant.");

  const transporter = getTransporter();
  const sendTimeoutMs = envInt("SMTP_SEND_TIMEOUT_MS", 15_000);
  const info = await Promise.race([
    transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`SMTP : délai dépassé (${sendTimeoutMs} ms).`)),
        sendTimeoutMs
      );
    }),
  ]);

  return { id: info.messageId };
}
