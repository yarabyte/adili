"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  createClient,
  deleteClient,
  updateClient,
  type ClientActionState,
} from "@/app/actions/clients";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClientFormFields,
  clientFormFromRow,
  emptyClientForm,
  type ClientContactValues,
  type ClientFormValues,
} from "@/components/clients/client-form-fields";

export type ClientListItem = {
  id: string;
  nom: string;
  type: "personne_physique" | "personne_morale" | null;
  contact: ClientContactValues | null;
  affairesCount: number;
  updatedAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  personne_physique: "Personne physique",
  personne_morale: "Personne morale",
};

function buildPayload(values: ClientFormValues) {
  const contact = {
    email: values.contact.email?.trim() || undefined,
    tel: values.contact.tel?.trim() || undefined,
    adresse: values.contact.adresse?.trim() || undefined,
    rccm: values.contact.rccm?.trim() || undefined,
    nif: values.contact.nif?.trim() || undefined,
  };
  const hasContact = Object.values(contact).some(Boolean);
  return {
    nom: values.nom.trim(),
    type: values.type || undefined,
    contact: hasContact ? contact : undefined,
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function ClientsManager({
  clients,
  canDelete,
}: {
  clients: ClientListItem[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientListItem | null>(null);
  const [formValues, setFormValues] = useState<ClientFormValues>(emptyClientForm());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const contact = c.contact ?? {};
      return (
        c.nom.toLowerCase().includes(q) ||
        (contact.email?.toLowerCase().includes(q) ?? false) ||
        (contact.tel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [clients, query]);

  function openCreate() {
    setError(null);
    setFieldErrors({});
    setFormValues(emptyClientForm());
    setCreateOpen(true);
  }

  function openEdit(client: ClientListItem) {
    setError(null);
    setFieldErrors({});
    setFormValues(clientFormFromRow(client));
    setEditClient(client);
  }

  function closeDialogs() {
    setCreateOpen(false);
    setEditClient(null);
  }

  function applyResult(res: ClientActionState, onSuccess: () => void) {
    if (res.error) setError(res.error);
    if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    if (res.ok) {
      closeDialogs();
      onSuccess();
    }
  }

  function handleCreate() {
    setError(null);
    setFieldErrors({});
    const payload = buildPayload(formValues);
    const fd = new FormData();
    fd.set("nom", payload.nom);
    if (payload.type) fd.set("type", payload.type);
    if (payload.contact?.email) fd.set("contact.email", payload.contact.email);
    if (payload.contact?.tel) fd.set("contact.tel", payload.contact.tel);
    if (payload.contact?.adresse) fd.set("contact.adresse", payload.contact.adresse);
    if (payload.contact?.rccm) fd.set("contact.rccm", payload.contact.rccm);
    if (payload.contact?.nif) fd.set("contact.nif", payload.contact.nif);

    startTransition(async () => {
      const res = await createClient({}, fd);
      applyResult(res, () => router.refresh());
    });
  }

  function handleUpdate() {
    if (!editClient) return;
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const res = await updateClient(editClient.id, buildPayload(formValues));
      applyResult(res, () => router.refresh());
    });
  }

  async function handleDelete(client: ClientListItem) {
    if (!canDelete) return;
    const ok = await confirm({
      title: "Supprimer ce client ?",
      description:
        client.affairesCount > 0
          ? `${client.nom} est lié à ${client.affairesCount} affaire(s). La suppression sera refusée tant que ces dossiers existent.`
          : `Le client « ${client.nom} » sera supprimé définitivement.`,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteClient(client.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client…"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau client
        </Button>
      </div>

      {error && !createOpen && !editClient && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-brand-justice/12 bg-card shadow-sm">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {clients.length === 0
              ? "Aucun client enregistré. Créez-en un pour vos affaires."
              : "Aucun client ne correspond à votre recherche."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-brand-justice/10 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Affaires</th>
                  <th className="px-4 py-3">Mis à jour</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const contact = client.contact ?? {};
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-brand-justice/8 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {client.nom}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.type ? TYPE_LABEL[client.type] : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="space-y-0.5">
                          {contact.email && <p>{contact.email}</p>}
                          {contact.tel && <p>{contact.tel}</p>}
                          {!contact.email && !contact.tel && <span>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {client.affairesCount}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(client.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(client)}
                            aria-label={`Modifier ${client.nom}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleDelete(client)}
                              disabled={pending}
                              aria-label={`Supprimer ${client.nom}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!canDelete && (
        <p className="text-xs text-muted-foreground">
          Seul le propriétaire du cabinet peut supprimer un client.
        </p>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Ce client pourra être sélectionné lors de la création d&apos;une affaire.
            </DialogDescription>
          </DialogHeader>
          <ClientFormFields
            values={formValues}
            onChange={setFormValues}
            fieldErrors={fieldErrors}
            idPrefix="create-client"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeDialogs}>
              Annuler
            </Button>
            <Button type="button" onClick={handleCreate} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Créer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editClient)}
        onOpenChange={(open) => !open && setEditClient(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>{editClient?.nom}</DialogDescription>
          </DialogHeader>
          <ClientFormFields
            values={formValues}
            onChange={setFormValues}
            fieldErrors={fieldErrors}
            idPrefix="edit-client"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeDialogs}>
              Annuler
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
