import fs from "fs/promises";
import path from "path";
import { z } from "zod";

export const CORPUS_NATIONAL_DIR = path.join(
  process.cwd(),
  "corpus",
  "cameroun"
);

export const DEFAULT_NATIONAL_MANIFEST_PATH = path.join(
  process.cwd(),
  "lib",
  "corpus",
  "national-manifest.json"
);

const NationalManifestEntryZ = z.object({
  file: z.string().min(1),
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9][A-Z0-9._-]*$/i),
  title: z.string().min(3).max(500),
  reference: z.string().max(120).optional(),
  country: z.string().length(2).default("CM"),
  countryLabel: z.string().min(2).max(80).default("Cameroun"),
  documentKind: z.string().max(40).optional(),
});

export const NationalManifestZ = z.object({
  documents: z.array(NationalManifestEntryZ).min(1),
});

export type NationalManifestEntry = z.infer<typeof NationalManifestEntryZ>;
export type NationalManifest = z.infer<typeof NationalManifestZ>;

export async function loadNationalManifest(
  manifestPath = DEFAULT_NATIONAL_MANIFEST_PATH
): Promise<NationalManifest> {
  const raw = await fs.readFile(manifestPath, "utf8");
  return NationalManifestZ.parse(JSON.parse(raw));
}
