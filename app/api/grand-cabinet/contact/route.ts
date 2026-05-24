import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/json";
import {
  excerptGrandCabinetMessage,
  grandCabinetLeadConfirmationHtml,
  grandCabinetLeadConfirmationText,
} from "@/lib/email/templates/grand-cabinet-lead-confirmation";
import { sendEmail } from "@/lib/email/smtp";
import { db } from "@/lib/db/client";
import { leadsGrandCabinet } from "@/lib/db/schema";

const Body = z.object({
  nomCabinet: z.string().min(2).max(200),
  ville: z.string().min(2).max(120),
  nombreAvocats: z.coerce.number().int().min(1).max(5000),
  telephone: z.string().min(8).max(40),
  email: z.string().email().max(200),
  message: z.string().min(20).max(5000),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Données invalides", 400);
  }

  const [lead] = await db
    .insert(leadsGrandCabinet)
    .values({
      nomCabinet: body.nomCabinet.trim(),
      ville: body.ville.trim(),
      nombreAvocats: body.nombreAvocats,
      telephone: body.telephone.trim(),
      email: body.email.trim().toLowerCase(),
      message: body.message.trim(),
      statut: "nouveau",
    })
    .returning({ id: leadsGrandCabinet.id });

  const confirmationParams = {
    nomCabinet: body.nomCabinet.trim(),
    ville: body.ville.trim(),
    nombreAvocats: body.nombreAvocats,
    telephone: body.telephone.trim(),
    messageExtrait: excerptGrandCabinetMessage(body.message.trim()),
  };

  try {
    await sendEmail({
      to: body.email.trim().toLowerCase(),
      subject: `Adili — Demande Grand Cabinet reçue (${body.nomCabinet.trim()})`,
      html: grandCabinetLeadConfirmationHtml(confirmationParams),
      text: grandCabinetLeadConfirmationText(confirmationParams),
    });
  } catch (err) {
    console.error("[grand-cabinet/contact] confirmation email", err);
  }

  try {
    const adminEmail =
      process.env.ADILI_SALES_EMAIL ?? process.env.ADMIN_BOOTSTRAP_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Adili] Lead Grand Cabinet — ${body.nomCabinet}`,
        html: `<p>Nouveau lead Grand Cabinet.</p>
          <ul>
            <li>Cabinet : ${body.nomCabinet}</li>
            <li>Ville : ${body.ville}</li>
            <li>Avocats : ${body.nombreAvocats}</li>
            <li>Tél. : ${body.telephone}</li>
            <li>Email : ${body.email}</li>
          </ul>
          <p>${body.message}</p>`,
      });
    }
  } catch (err) {
    console.error("[grand-cabinet/contact] sales notification", err);
  }

  return jsonOk({
    id: lead.id,
    message:
      "Merci — notre équipe vous recontacte sous 48 h ouvrées.",
  });
}
