"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary racine. Sans ce fichier, certaines erreurs serveur
 * (notamment côté `/print/...`) remontent jusqu'à l'error boundary par
 * défaut de Next.js qui utilise `usePathname()`, ce qui peut produire
 * un crash secondaire opaque (« Cannot read properties of null (reading
 * 'useContext') »).
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] render error:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
        background: "#f0eada",
        color: "#0a162a",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          background: "#fffaf0",
          border: "1px solid #c8b878",
          borderRadius: 14,
          padding: 32,
          boxShadow: "0 8px 24px rgba(10, 22, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#1d3260",
          }}
        >
          Adili
        </p>
        <h1 style={{ margin: "8px 0 12px", fontSize: 24, fontWeight: 700 }}>
          Une erreur inattendue est survenue
        </h1>
        <p style={{ margin: "0 0 16px", lineHeight: 1.55 }}>
          La page n&apos;a pas pu s&apos;afficher. Vous pouvez réessayer,
          ou retourner au tableau de bord pour reprendre votre travail.
        </p>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 12.5,
            color: "#4b576a",
            fontFamily: "Menlo, Monaco, monospace",
          }}
        >
          {error.message}
          {error.digest ? ` (ref ${error.digest})` : ""}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          <Link
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "transparent",
              color: "#1d3260",
              border: "1px solid #1d3260",
              borderRadius: 6,
              padding: "8px 16px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </main>
  );
}
