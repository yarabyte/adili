"use client";

import Link from "next/link";
import { ArrowRight, Building2, Mail, MailQuestion, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { CabinetForm } from "./cabinet-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  avocat: "Avocat",
  collaborateur: "Collaborateur",
};

type OnboardingTabsProps = {
  defaultName?: string;
  plan?: "individuel" | "cabinet";
  pendingInvitation?: {
    token: string;
    cabinetName: string;
    role: string;
  };
};

export function OnboardingTabs({
  defaultName,
  plan = "individuel",
  pendingInvitation,
}: OnboardingTabsProps) {
  const defaultTab = pendingInvitation ? "rejoindre" : "creer";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList aria-label="Choix d'entrée dans Adili">
        <TabsTrigger value="rejoindre">
          <Users className="h-4 w-4" aria-hidden />
          Rejoindre
        </TabsTrigger>
        <TabsTrigger value="creer">
          <Building2 className="h-4 w-4" aria-hidden />
          Créer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="rejoindre" className="mt-6">
        {pendingInvitation ? (
          <div className="rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-left">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold/25 text-brand-ink">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-ink">
                  Une invitation vous attend
                </p>
                <p className="mt-1 text-sm text-foreground">
                  <strong>{pendingInvitation.cabinetName}</strong> vous a
                  invité·e à rejoindre son espace Adili
                  {ROLE_LABELS[pendingInvitation.role]
                    ? ` en tant que ${ROLE_LABELS[pendingInvitation.role]}`
                    : ""}
                  .
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  En acceptant, votre compte sera automatiquement rattaché à ce
                  cabinet.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href={`/invitations/${pendingInvitation.token}`}>
                    Rejoindre {pendingInvitation.cabinetName}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-brand-justice/25 bg-muted/30 p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-justice/10 text-brand-justice">
              <MailQuestion className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">
              Aucune invitation en attente
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Demandez à un administrateur de votre cabinet de vous inviter via
              l&apos;onglet « Cabinet » de son espace Adili, ou créez le vôtre
              dans l&apos;onglet voisin.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="creer" className="mt-6">
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Créer votre propre cabinet vous en fait l&apos;administrateur. Vous
          pourrez inviter vos collaborateurs (admin, avocat, collaborateur) une
          fois le cabinet créé.
        </p>
        <CabinetForm defaultName={defaultName} plan={plan} />
      </TabsContent>
    </Tabs>
  );
}
