"use client";

import type { ReactNode } from "react";

import { CrSaveQueueProvider } from "./cr-save-queue";

/** Regroupe formulaire + éditeur avec une file de sauvegarde partagée. */
export function CrEditLayout({ children }: { children: ReactNode }) {
  return <CrSaveQueueProvider>{children}</CrSaveQueueProvider>;
}
