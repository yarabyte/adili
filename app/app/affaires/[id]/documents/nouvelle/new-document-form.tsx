"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CircleAlert, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createDocument,
  type DocumentActionState,
} from "@/app/actions/documents";
import {
  LABELS_DOCUMENTS,
  TYPES_DOCUMENTS,
} from "@/lib/constants/types-documents";

const initialState: DocumentActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden />
      )}
      Créer et rédiger
    </Button>
  );
}

export function NewDocumentForm({ affaireId }: { affaireId: string }) {
  const [state, formAction] = useFormState(createDocument, initialState);

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-xl border border-brand-justice/15 bg-card p-6 shadow-sm"
    >
      <input type="hidden" name="affaireId" value={affaireId} />

      <div className="space-y-1.5">
        <label htmlFor="titre" className="text-sm font-medium text-foreground">
          Titre de la pièce
        </label>
        <input
          id="titre"
          name="titre"
          type="text"
          required
          minLength={3}
          maxLength={255}
          placeholder="Ex : Conclusions au fond — affaire Bensoussan c/ SOTRAC"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-invalid={Boolean(state.fieldErrors?.titre)}
          aria-describedby={state.fieldErrors?.titre ? "titre-err" : undefined}
        />
        {state.fieldErrors?.titre && (
          <p
            id="titre-err"
            className="text-[12.5px] text-destructive"
            role="alert"
          >
            {state.fieldErrors.titre}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="typeDocument"
          className="text-sm font-medium text-foreground"
        >
          Type de pièce
        </label>
        <select
          id="typeDocument"
          name="typeDocument"
          required
          defaultValue=""
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-invalid={Boolean(state.fieldErrors?.typeDocument)}
          aria-describedby={
            state.fieldErrors?.typeDocument ? "type-err" : undefined
          }
        >
          <option value="" disabled>
            Choisir un type
          </option>
          {Object.entries(TYPES_DOCUMENTS).map(([catKey, cat]) => (
            <optgroup key={catKey} label={cat.label}>
              {cat.items.map((item) => (
                <option key={item} value={item}>
                  {LABELS_DOCUMENTS[item] ?? item}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {state.fieldErrors?.typeDocument && (
          <p
            id="type-err"
            className="text-[12.5px] text-destructive"
            role="alert"
          >
            {state.fieldErrors.typeDocument}
          </p>
        )}
        <p className="text-[12px] text-muted-foreground">
          Le type sert à classer la pièce dans l&apos;historique et à
          pré-remplir certains modèles plus tard.
        </p>
      </div>

      {state.error && !state.fieldErrors && (
        <p
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive"
          role="alert"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-brand-justice/10 pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
