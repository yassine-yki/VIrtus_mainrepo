import { filtersUrl, parseFilters } from "./search";
import type { Filters } from "./types";
export const catalogCategories = [
  { id: "jobs", label: "EMPLOIS", hint: "Votre prochaine étape" },
  { id: "tech", label: "TECH", hint: "Construire demain" },
  { id: "internships", label: "STAGES", hint: "Faire ses premiers pas" },
  { id: "competitions", label: "CONCOURS", hint: "Le service public" },
  { id: "remote", label: "À DISTANCE", hint: "Travailler depuis le Maroc" },
] as const;
export type CatalogCategory = (typeof catalogCategories)[number]["id"];
/** Only category navigation resets destination-specific constraints. */
export function categoryUrl(
  filters: Filters,
  category: CatalogCategory,
): string {
  const base = parseFilters({
    q: filters.q,
    city: filters.city,
    days: String(filters.days),
    sort: filters.sort,
  });
  const presets: Record<CatalogCategory, Partial<Filters>> = {
    jobs: { kind: "job" },
    tech: { kind: "job", tech: "1" },
    internships: { kind: "job", contract: "Stage" },
    competitions: { kind: "competition" },
    remote: { kind: "job", workplace: "remote" },
  };
  return filtersUrl(base, { ...presets[category], page: 1 });
}
export function activeCategory(filters: Filters): CatalogCategory | undefined {
  if (filters.tech === "1") return "tech";
  if (filters.kind === "competition") return "competitions";
  if (filters.workplace === "remote") return "remote";
  if (filters.contract === "Stage") return "internships";
  if (filters.kind === "job") return "jobs";
}
export function hasCatalogContext(
  params: Record<string, string | string[] | undefined>,
): boolean {
  const known = Object.keys(parseFilters({}));
  return known.some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.some((v) => v.trim()) : !!value?.trim();
  });
}
