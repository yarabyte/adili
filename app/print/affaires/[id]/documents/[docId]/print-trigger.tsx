"use client";

import { useEffect, useState } from "react";

/**
 * Déclenche automatiquement la boîte de dialogue d'impression à
 * l'ouverture de la page, puis garde une barre d'outils légère pour
 * relancer l'impression ou revenir en arrière. La barre est masquée
 * dans le rendu papier (cf. `@media print`).
 */
export function PrintTrigger({ documentTitle }: { documentTitle: string }) {
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    // On laisse un court délai pour que les fonts s'appliquent avant
    // que le navigateur ne fige la mise en page.
    const previousTitle = document.title;
    document.title = `${documentTitle} — Adili`;
    const id = setTimeout(() => {
      window.print();
      setPrinted(true);
    }, 350);
    return () => {
      clearTimeout(id);
      document.title = previousTitle;
    };
  }, [documentTitle]);

  return (
    <div className="print-toolbar" role="toolbar" aria-label="Impression">
      <span>
        <strong>Aperçu impression</strong> · La boîte de dialogue
        d&apos;impression {printed ? "s'est ouverte" : "va s'ouvrir"}.
        Choisissez « Enregistrer au format PDF » comme destination.
      </span>
      <span style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="secondary"
          onClick={() => window.close()}
        >
          Fermer
        </button>
        <button type="button" onClick={() => window.print()}>
          Réimprimer
        </button>
      </span>
    </div>
  );
}
