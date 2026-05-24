import "server-only";

const BUCKET = "cabinet-logos";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export function cabinetLogoObjectPath(cabinetId: string, mime: string): string {
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";
  return `${cabinetId}/logo.${ext}`;
}

export function validateCabinetLogoFile(file: File): string | null {
  if (!file.size) return "Fichier vide.";
  if (file.size > MAX_BYTES) return "Logo trop volumineux (max. 2 Mo).";
  if (!ALLOWED.has(file.type)) {
    return "Format accepté : PNG, JPEG ou WebP.";
  }
  return null;
}

export { BUCKET, MAX_BYTES, ALLOWED };
