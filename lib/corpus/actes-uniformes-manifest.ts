import fs from "fs/promises";
import path from "path";
import { z } from "zod";

export const CORPUS_ACTES_DIR = path.join(
  process.cwd(),
  "corpus",
  "acte-uniformes"
);

/** Manifeste versionné (les PDF restent dans `corpus/acte-uniformes/`, gitignored). */
export const DEFAULT_MANIFEST_PATH = path.join(
  process.cwd(),
  "lib",
  "corpus",
  "actes-uniformes-manifest.json"
);

const ActeManifestEntryZ = z.object({
  /** Nom du fichier PDF dans `corpus/acte-uniformes/` */
  file: z.string().min(1),
  /** Code court (nouvelle nomenclature), ex. AUDCG, AUSCGIE… */
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/i, "Code invalide."),
  title: z.string().min(3).max(500),
  /** Référence éditoriale optionnelle (révision, date…) */
  reference: z.string().max(120).optional(),
});

export const ActesUniformesManifestZ = z.object({
  /** Référence commune à toutes les sources (défaut OHADA) */
  reference: z.string().min(1).max(120).default("OHADA"),
  documents: z.array(ActeManifestEntryZ).min(1),
});

export type ActeManifestEntry = z.infer<typeof ActeManifestEntryZ>;
export type ActesUniformesManifest = z.infer<typeof ActesUniformesManifestZ>;

export async function loadActesUniformesManifest(
  manifestPath = DEFAULT_MANIFEST_PATH
): Promise<ActesUniformesManifest> {
  const raw = await fs.readFile(manifestPath, "utf8");
  const json: unknown = JSON.parse(raw);
  return ActesUniformesManifestZ.parse(json);
}
