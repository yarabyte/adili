import { TYPES_DOCUMENTS } from "@/lib/constants/types-documents";

export type DocumentCategory = keyof typeof TYPES_DOCUMENTS;

const TYPE_TO_CATEGORY = new Map<string, DocumentCategory>(
  (
    Object.entries(TYPES_DOCUMENTS) as [
      DocumentCategory,
      (typeof TYPES_DOCUMENTS)[DocumentCategory],
    ][]
  ).flatMap(([cat, group]) =>
    group.items.map((type) => [type, cat] as const)
  )
);

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string }[] =
  Object.entries(TYPES_DOCUMENTS).map(([id, group]) => ({
    id: id as DocumentCategory,
    label: group.label,
  }));

export function getDocumentCategory(
  typeDocument: string
): DocumentCategory | null {
  return TYPE_TO_CATEGORY.get(typeDocument) ?? null;
}
