"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createInvitation,
  type InvitationFormState,
} from "@/app/actions/invitations";

const initialState: InvitationFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Mail className="h-4 w-4" aria-hidden />
      )}
      Envoyer l&apos;invitation
    </Button>
  );
}

export function InvitationForm() {
  const [state, action] = useFormState(createInvitation, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-2">
          <Label htmlFor="email">Email du collaborateur</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="collegue@cabinet.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rôle cabinet</Label>
          <select
            id="role"
            name="role"
            defaultValue="avocat"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="avocat">Avocat</option>
            <option value="collaborateur">Collaborateur</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.message && (
        <p
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
