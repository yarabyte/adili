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
  const normalized = normalizeLegalExtract(text);
  const paragraphs = normalized
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
        "space-y-3 text-[15px] leading-[1.7] text-foreground/90 [text-wrap:pretty]",
        className
      )}
    >
      {paragraphs.map((p, i) => {
        const lines = p
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const isList = lines.length > 1 && lines.every(isListLikeLine);

        if (isList) {
          return (
            <ul key={i} className="space-y-1.5 pl-5">
              {lines.map((line, idx) => (
                <li key={idx} className="marker:text-brand-justice/55">
                  {line}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{renderWithLineBreaks(p)}</p>;
      })}
    </div>
  );
}

function normalizeLegalExtract(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // Découpe les subdivisions juridiques courantes.
    .replace(/\s([a-z]\))/gi, "\n$1")
    .replace(/\s-\s+/g, "\n- ")
    .replace(/;\s+(?=(?:\(\d+\)|[a-z]\)|- ))/g, ";\n")
    .replace(/([.?!])\s+(?=(?:\(\d+\)|[a-z]\)|- ))/g, "$1\n")
    .trim();
}

function isListLikeLine(line: string): boolean {
  return (
    /^([a-z]\)|\(\d+\)|-)\s*/i.test(line) ||
    /^Art\.\s*\d+/i.test(line) ||
    /^Article\s+\d+/i.test(line)
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
