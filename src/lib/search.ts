import { fold, key } from "./normalize";
import { deadlineOpen } from "./deadline";
import type {
  CatalogSnapshot,
  Filters,
  Job,
  Listing,
  SearchResult,
} from "./types";

export const PAGE_SIZE = 12;
export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): Filters {
  const single = (name: string) =>
    (Array.isArray(params[name])
      ? params[name][0]
      : (params[name] ?? "")
    ).trim();
  return {
    kind: ["job", "competition"].includes(single("kind"))
      ? (single("kind") as "job" | "competition")
      : "",
    q: single("q").slice(0, 120),
    city: single("city").slice(0, 60),
    contract: [
      "CDI",
      "CDD",
      "Stage",
      "Freelance",
      "Intérim",
      "Non précisé",
    ].includes(single("contract"))
      ? single("contract")
      : "",
    workplace: ["onsite", "hybrid", "remote", "unknown"].includes(
      single("workplace"),
    )
      ? single("workplace")
      : "",
    source: single("source")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 60),
    days: [1, 7, 30].includes(Number(single("days")))
      ? Number(single("days"))
      : 0,
    page: Math.min(10000, Math.max(1, Math.floor(Number(single("page")) || 1))),
    sort: single("sort") === "relevance" ? "relevance" : "recent",
  };
}

export function filtersUrl(
  filters: Filters,
  changes: Partial<Filters> = {},
): string {
  const merged = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(merged)) {
    if (
      value &&
      !(name === "page" && value === 1) &&
      !(name === "sort" && value === "recent")
    )
      params.set(name, String(value));
  }
  return `/?${params.toString()}#offres`;
}

export function groupListings(
  listings: Listing[],
  sourceNames: Map<string, string>,
): Job[] {
  const groups = new Map<string, Job>();
  for (const listing of listings) {
    const source = {
      id: listing.source_id,
      name: sourceNames.get(listing.source_id) ?? listing.company,
      url: listing.url,
    };
    const existing = groups.get(listing.group_key);
    if (existing) {
      if (
        !existing.sources.some(
          (item) => item.id === source.id && item.url === source.url,
        )
      )
        existing.sources.push(source);
    } else groups.set(listing.group_key, { ...listing, sources: [source] });
  }
  return [...groups.values()];
}

export function searchSnapshot(
  snapshot: CatalogSnapshot,
  filters: Filters,
  includePending: boolean,
  now = Date.now(),
): SearchResult {
  const permitted = snapshot.sources.filter(
    (source) =>
      source.enabled &&
      (source.publicationStatus === "approved" ||
        (includePending && source.publicationStatus === "pending")),
  );
  const ids = new Set(permitted.map((source) => source.id));
  const all = groupListings(
    snapshot.listings.filter(
      (job) =>
        job.active &&
        deadlineOpen(job.deadline, now) &&
        ids.has(job.source_id) &&
        new Date(job.last_seen_at).getTime() >= now - 72 * 3600_000,
    ),
    new Map(permitted.map((source) => [source.id, source.name])),
  );
  const terms = fold(filters.q).split(/\s+/).filter(Boolean);
  const score = (job: Job) =>
    terms.reduce(
      (value, term) =>
        value +
        (fold(job.title).includes(term) ? 3 : 0) +
        (fold(job.company).includes(term) ? 2 : 0),
      0,
    );
  const matches = all.filter((job) => {
    const text = fold(`${job.title} ${job.company} ${job.description}`);
    return (
      terms.every((term) => text.includes(term)) &&
      (!filters.kind || (job.kind ?? "job") === filters.kind) &&
      (!filters.city || job.city_keys.includes(filters.city)) &&
      (!filters.contract || job.contract === filters.contract) &&
      (!filters.workplace || job.workplace === filters.workplace) &&
      (!filters.source ||
        job.sources.some((source) => source.id === filters.source)) &&
      (!filters.days ||
        (job.published_at &&
          new Date(job.published_at).getTime() >=
            now - filters.days * 86_400_000))
    );
  });
  matches.sort(
    (a, b) =>
      (filters.sort === "relevance" && terms.length
        ? score(b) - score(a)
        : 0) ||
      Date.parse(b.published_at ?? b.first_seen_at ?? b.last_seen_at) -
        Date.parse(a.published_at ?? a.first_seen_at ?? a.last_seen_at) ||
      a.id.localeCompare(b.id),
  );
  const cities = new Map<
    string,
    { key: string; name: string; count: number }
  >();
  for (const job of all)
    for (const city of job.locations) {
      const cityKey = key(city);
      if (job.city_keys.includes(cityKey)) {
        const entry = cities.get(cityKey) ?? {
          key: cityKey,
          name: city,
          count: 0,
        };
        entry.count++;
        cities.set(cityKey, entry);
      }
    }
  const total = matches.length;
  const page = Math.min(
    filters.page,
    Math.max(1, Math.ceil(total / PAGE_SIZE)),
  );
  return {
    jobs: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    page,
    pageSize: PAGE_SIZE,
    cities: [...cities.values()].sort((a, b) => b.count - a.count),
    companies: new Set(all.map((job) => job.company)).size,
    sources: permitted.map((source) => ({
      id: source.id,
      name: source.name,
      count: all.filter((job) =>
        job.sources.some((item) => item.id === source.id),
      ).length,
      checked_at:
        snapshot.runs.find(
          (run) => run.source_id === source.id && run.status === "success",
        )?.finished_at ?? null,
      website: source.website,
      provider: source.provider,
      publication_status: source.publicationStatus,
      permission_note: source.permissionNote,
    })),
    checked_at: snapshot.collected_at,
    mode: "snapshot",
  };
}
