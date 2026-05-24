import { customAlphabet } from "nanoid";

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export function generateVirementReference(): string {
  const year = new Date().getFullYear();
  return `ADL-${year}-${nano()}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-6);
  return `ADL-${year}-${seq}`;
}
