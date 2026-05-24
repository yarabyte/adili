import { requireCabinetOwnerPage } from "@/lib/billing/require-owner";

export const dynamic = "force-dynamic";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCabinetOwnerPage();
  return children;
}
