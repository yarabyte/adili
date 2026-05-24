"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  LABELS_CONTENTIEUX,
  TYPES_CONTENTIEUX,
} from "@/lib/constants/types-contentieux";

const DEBOUNCE_MS = 380;

export function AffaireFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params?.get("q") ?? "");
  const type = params?.get("type") ?? "";

  useEffect(() => {
    setQ(params?.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const trimmed = q.trim();
      const inUrl = url.searchParams.get("q")?.trim() ?? "";
      if (trimmed === inUrl) return;
      if (trimmed) url.searchParams.set("q", trimmed);
      else url.searchParams.delete("q");
      router.replace(
        url.searchParams.toString()
          ? `${url.pathname}?${url.searchParams.toString()}`
          : url.pathname
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [q, router]);

  function pushParams(next: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) {
      if (v && v.length > 0) {
        url.searchParams.set(k, v);
      } else {
        url.searchParams.delete(k);
      }
    }
    const qs = url.searchParams.toString();
    router.replace(qs ? `${url.pathname}?${qs}` : url.pathname);
  }

  const hasActive = Boolean(q.trim() || type);

  return (
    <section
      aria-label="Filtres"
      className="flex flex-col gap-3 rounded-xl border border-brand-justice/10 bg-card p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="relative flex flex-1 min-w-[220px] items-center">
        <Search
          className="absolute left-3 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par référence ou intitulé…"
          className="pl-9"
          aria-label="Recherche par référence ou intitulé"
        />
      </div>

      <select
        value={type}
        onChange={(e) => pushParams({ type: e.target.value || null })}
        aria-label="Filtrer par contentieux"
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Tous contentieux</option>
        {TYPES_CONTENTIEUX.map((t) => (
          <option key={t} value={t}>
            {LABELS_CONTENTIEUX[t]}
          </option>
        ))}
      </select>

      {hasActive && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-brand-justice/20"
          onClick={() => {
            setQ("");
            router.replace(window.location.pathname);
          }}
        >
          <X className="h-4 w-4" aria-hidden />
          Réinitialiser
        </Button>
      )}
    </section>
  );
}
