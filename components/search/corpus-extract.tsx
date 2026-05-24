import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * Rendu typographique d'un extrait du corpus juridique :
 * paragraphes nettoyés, taille / interligne lisibles, retour ligne
 * conservé à l'intérieur d'un paragraphe.
 */
export function CorpusExtract({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return (
      <p className={cn("text-sm italic text-muted-foreground", className)}>
        Aucun extrait lisible — le PDF source contient probablement des
        images ou une mise en page non reconnue.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "space-y-3 text-[15px] leading-[1.65] text-foreground/90 [text-wrap:pretty]",
        className
      )}
    >
      {paragraphs.map((p, i) => (
        <p key={i}>{renderWithLineBreaks(p)}</p>
      ))}
    </div>
  );
}

function renderWithLineBreaks(text: string) {
  const segments = text.split("\n");
  return segments.flatMap((segment, i) =>
    i === 0
      ? [<Fragment key={i}>{segment}</Fragment>]
      : [
          <br key={`br-${i}`} />,
          <Fragment key={`s-${i}`}>{segment}</Fragment>,
        ]
  );
}
