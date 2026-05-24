import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { AdiliLogo } from "@/components/brand/adili-logo";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { cabinets, invitations } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";

import { acceptInvitationFromForm } from "@/app/actions/invitations";
import { InvitationSignupForm } from "./signup-form";

export const metadata = { title: "Invitation · Adili" };
export const dynamic = "force-dynamic";

type Status = "ok" | "invalid" | "expired" | "already-used";

type Role = "admin" | "avocat" | "collaborateur";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  avocat: "Avocat",
  collaborateur: "Collaborateur",
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Accès complet aux membres, paramètres et données du cabinet.",
  avocat: "Recherche OHADA, dossiers et notes du cabinet.",
  collaborateur:
    "Recherche et consultation, sans accès aux paramètres du cabinet.",
};

async function loadInvitation(token: string): Promise<
  | {
      status: "ok";
      email: string;
      cabinetName: string;
      role: Role;
    }
  | {
      status: Exclude<Status, "ok">;
      email?: string;
      cabinetName?: string;
    }
> {
  const [row] = await db
    .select({
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      cabinetName: cabinets.name,
    })
    .from(invitations)
    .innerJoin(cabinets, eq(invitations.cabinetId, cabinets.id))
    .where(eq(invitations.token, token))
    .limit(1);

  if (!row) return { status: "invalid" };
  if (row.acceptedAt)
    return {
      status: "already-used",
      email: row.email,
      cabinetName: row.cabinetName,
    };
  if (row.expiresAt.getTime() < Date.now())
    return {
      status: "expired",
      email: row.email,
      cabinetName: row.cabinetName,
    };

  return {
    status: "ok",
    email: row.email,
    cabinetName: row.cabinetName,
    role: row.role as Role,
  };
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-brand-justice/10 bg-card p-8 shadow-xl sm:p-10">
        {children}
      </div>
    </div>
  );
}

export default async function InvitationPage({
  params,
}: {
  params: { token: string };
}) {
  const invitation = await loadInvitation(params.token);

  if (invitation.status !== "ok") {
    const labels: Record<
      Exclude<Status, "ok">,
      { title: string; desc: string }
    > = {
      invalid: {
        title: "Invitation introuvable",
        desc: "Le lien est invalide ou a été supprimé. Demandez une nouvelle invitation au cabinet.",
      },
      expired: {
        title: "Invitation expirée",
        desc: "Ce lien d'invitation a dépassé sa date de validité (7 jours).",
      },
      "already-used": {
        title: "Invitation déjà utilisée",
        desc: "Cette invitation a déjà été acceptée. Vous pouvez vous connecter directement.",
      },
    };
    const label = labels[invitation.status];

    return (
      <CardShell>
        <div className="flex flex-col items-center text-center">
          <AdiliLogo href="/" height={40} priority className="mx-auto" />
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" aria-hidden />
          </div>
          <h1 className="mt-5 font-heading text-2xl font-semibold text-brand-ink">
            {label.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {label.desc}
          </p>
          <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row">
            <Button asChild className="w-full">
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </div>
        </div>
      </CardShell>
    );
  }

  const session = await getCurrentProfile();
  const roleLabel = ROLE_LABELS[invitation.role];
  const roleDesc = ROLE_DESCRIPTIONS[invitation.role];

  return (
    <CardShell>
      <div className="flex flex-col items-center text-center">
        <AdiliLogo href="/" height={40} priority className="mx-auto" />
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-sage/12">
          <CheckCircle2 className="h-7 w-7 text-brand-sage" aria-hidden />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-gold">
          Invitation cabinet
        </p>
        <h1 className="mt-1.5 font-heading text-2xl font-semibold leading-tight text-brand-ink">
          Rejoindre {invitation.cabinetName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Invitation envoyée à{" "}
          <strong className="text-foreground">{invitation.email}</strong>.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-brand-parchment-dark bg-brand-parchment/60 p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-justice">
          Rôle proposé
        </p>
        <p className="mt-1 text-sm font-semibold text-brand-ink">{roleLabel}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {roleDesc}
        </p>
      </div>

      {!session ? (
        <div className="mt-6">
          <InvitationSignupForm
            token={params.token}
            email={invitation.email}
            redirectAfterLogin={`/invitations/${params.token}`}
          />
        </div>
      ) : (
        <form
          action={acceptInvitationFromForm}
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="token" value={params.token} />

          <div className="rounded-lg border border-brand-justice/10 bg-muted/30 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Connecté en tant que</p>
            <p className="mt-0.5 font-medium text-foreground">
              {session.user.email ?? "utilisateur"}
            </p>
          </div>

          {session.user.email &&
            session.user.email.toLowerCase() !==
              invitation.email.toLowerCase() && (
              <InfoNote tone="warning">
                Cette invitation avait été envoyée à{" "}
                <strong>{invitation.email}</strong>. Vous pouvez tout de même
                l&apos;accepter avec votre compte actuel.
              </InfoNote>
            )}

          {session.profile?.cabinetId && (
            <InfoNote tone="warning">
              Vous appartenez déjà à un cabinet. Accepter cette invitation
              <strong> remplacera</strong> votre cabinet courant.
            </InfoNote>
          )}

          <Button type="submit" className="h-11 w-full">
            Accepter l&apos;invitation
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-sage" aria-hidden />
            Lien personnel — utilisable une seule fois.
          </p>
        </form>
      )}
    </CardShell>
  );
}

function InfoNote({
  tone = "warning",
  children,
}: {
  tone?: "warning" | "info";
  children: React.ReactNode;
}) {
  const isWarn = tone === "warning";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs leading-relaxed ${
        isWarn
          ? "border-brand-gold/35 bg-brand-gold/8 text-brand-ink"
          : "border-brand-justice/15 bg-muted/40 text-foreground"
      }`}
    >
      <AlertTriangle
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          isWarn ? "text-brand-gold" : "text-brand-justice"
        }`}
        aria-hidden
      />
      <p className="flex-1">{children}</p>
    </div>
  );
}
