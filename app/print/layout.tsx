import "./print.css";

export const metadata = {
  title: "Impression — Adili",
};

/**
 * Layout dédié à l'impression. Volontairement isolé de l'AppShell (pas
 * de sidebar, pas de topbar, pas de status bar) : la sortie est une
 * page "papier" propre prête pour l'export PDF via la boîte de dialogue
 * d'impression du navigateur.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de wrapper supplémentaire : la page elle-même monte son
  // `<article class="print-shell">`, et le toolbar prend la pleine
  // largeur de la fenêtre avant l'impression.
  return <>{children}</>;
}
