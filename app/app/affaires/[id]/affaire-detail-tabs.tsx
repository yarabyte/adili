"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs } from "@/components/ui/tabs";
import {
  AFFAIRE_DETAIL_TAB_VALUES,
  type AffaireDetailTab,
  parseAffaireTabParam,
} from "@/lib/affaires/detail-tabs";

export type AffaireTab = AffaireDetailTab;

export function AffaireDetailTabs({
  initialTab,
  children,
  className,
}: {
  initialTab: AffaireDetailTab;
  children: React.ReactNode;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabFromUrl = parseAffaireTabParam(searchParams.get("tab"));
  const [value, setValue] = useState<AffaireDetailTab>(initialTab);

  useEffect(() => {
    setValue(tabFromUrl);
  }, [tabFromUrl]);

  const onValueChange = (next: string) => {
    if (!(AFFAIRE_DETAIL_TAB_VALUES as readonly string[]).includes(next)) {
      return;
    }
    const nextTab = next as AffaireDetailTab;

    setValue(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "documents") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      {children}
    </Tabs>
  );
}
