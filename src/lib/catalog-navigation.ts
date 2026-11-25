import { filtersUrl, parseFilters } from "./search";
import type { Filters } from "./types";
import { catalogCategories, type CatalogCategory } from "./catalog-categories";
export { catalogCategories };
export type { CatalogCategory };
/** Only category navigation resets destination-specific constraints. */
export function categoryUrl(
  filters: Filters,
  category: CatalogCategory,
): string {
  if (category === "profile") return "/profil";
  const base = parseFilters({
    q: filters.q,
    city: filters.city,
    days: String(filters.days),
    sort: filters.sort,
  });
  const presets: Record<
    Exclude<CatalogCategory, "profile">,
    Partial<Filters>
  > = {
    jobs: {},
    tech: { kind: "job", tech: "1" },
    internships: { kind: "job", contract: "Stage" },
    remote: { kind: "job", workplace: "remote" },
  };
  return filtersUrl(base, { ...presets[category], page: 1 });
}
export function activeCategory(filters: Filters): CatalogCategory | undefined {
  if (filters.tech === "1") return "tech";
  if (filters.workplace === "remote") return "remote";
  if (filters.contract === "Stage") return "internships";
  return "jobs";
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
