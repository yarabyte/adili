"use client";

import { useEffect } from "react";

/**
 * Error boundary local au tunnel `/print/...`. Sans ce fichier, une
 * erreur de rendu (DB, JSON mal formé, etc.) remonte jusqu'à l'error
 * boundary par défaut de Next.js qui tente d'utiliser `usePathname()` —
 * d'où le crash secondaire « Cannot read properties of null (reading
 * 'useContext') » qu'on a vu en dev.
 */
export default function PrintError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[print] render error:", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: "640px",
        margin: "80px auto",
        padding: "32px",
        fontFamily:
          '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
        color: "#0a162a",
        background: "#faf6ec",
        border: "1px solid #c8b878",
        borderRadius: "12px",
      }}
    >
      <h1
        style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 700 }}
      >
        Impression indisponible
      </h1>
      <p style={{ margin: "0 0 16px", lineHeight: 1.55 }}>
        Une erreur est survenue pendant la préparation de l&apos;aperçu
        d&apos;impression. Vous pouvez réessayer, ou revenir à
        l&apos;éditeur pour vérifier l&apos;état du document.
      </p>
      <p
        style={{
          margin: "0 0 24px",
          fontSize: "12.5px",
          color: "#4b576a",
          fontFamily: "Menlo, Monaco, monospace",
        }}
      >
        {error.message}
        {error.digest ? ` (ref ${error.digest})` : ""}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#1d3260",
            color: "#fff",
            border: 0,
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          style={{
            background: "transparent",
            color: "#1d3260",
            border: "1px solid #1d3260",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Fermer l&apos;onglet
        </button>
      </div>
    </div>
  );
}
