import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { searchSnapshot, PAGE_SIZE, groupListings } from "./search";
import { deadlineOpen } from "./deadline";
import type {
  CatalogSnapshot,
  Filters,
  Job,
  SearchResult,
  Source,
} from "./types";
import { classifyTech } from "./tech";

const empty = (error?: string): SearchResult => ({
  jobs: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  cities: [],
  companies: 0,
  sources: [],
  checked_at: null,
  mode: "unconfigured",
  error,
});
function client() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
async function snapshot(): Promise<CatalogSnapshot | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const data = JSON.parse(
      await readFile(
        resolve(process.env.LOCAL_CATALOG_PATH || "data/catalog.json"),
        "utf8",
      ),
    ) as CatalogSnapshot;
    return data.version === 1 &&
      Array.isArray(data.listings) &&
      Array.isArray(data.sources) &&
      Array.isArray(data.runs)
      ? data
      : null;
  } catch {
    return null;
  }
}
export async function searchCatalog(filters: Filters): Promise<SearchResult> {
  const local = await snapshot();
  if (local) {
    const result = searchSnapshot(local, filters, true);
    return {
      ...result,
      jobs: result.jobs.map((job) => ({ ...job, description: "" })),
    };
  }
  const supabase = client();
  if (!supabase) return empty();
  if (
    filters.tech ||
    filters.family ||
    filters.technology ||
    filters.seniority ||
    filters.language ||
    filters.pfe
  ) {
    try {
      const { jobs, sources } = await techCatalog();
      const snapshot: CatalogSnapshot = {
        version: 1,
        collected_at:
          jobs.map((j) => j.last_seen_at).sort()[0] || new Date().toISOString(),
        sources,
        listings: jobs,
        runs: [],
      };
      const result = searchSnapshot(snapshot, filters, true);
      return { ...result, mode: "supabase" };
    } catch {
      return empty("Le catalogue tech est momentanément indisponible.");
    }
  }
  const { data, error } = await supabase.rpc("search_catalog", {
    p_query: filters.q,
    p_city: filters.city,
    p_contract: filters.contract,
    p_workplace: filters.workplace,
    p_source: filters.source,
    p_days: filters.days,
    p_page: filters.page,
    p_sort: filters.sort,
    p_kind: filters.kind ?? "",
  });
  if (error) {
    console.error("Catalog search failed", { code: error.code });
    return empty(
      "La recherche est momentanément indisponible. Réessayez dans quelques instants.",
    );
  }
  return { ...data, mode: "supabase" } as SearchResult;
}
export async function techCatalog(): Promise<{
  jobs: Job[];
  sources: Source[];
}> {
  const local = await snapshot();
  if (local) {
    const names = new Map(local.sources.map((s) => [s.id, s.name]));
    const permitted = new Set(
      local.sources
        .filter((s) => s.enabled && s.publicationStatus !== "blocked")
        .map((s) => s.id),
    );
    return {
      sources: local.sources,
      jobs: groupListings(
        local.listings
          .filter(
            (j) =>
              permitted.has(j.source_id) &&
              j.active &&
              deadlineOpen(j.deadline) &&
              Date.parse(j.last_seen_at) > Date.now() - 72 * 3600000,
          )
          .map((j) => ({
            ...j,
            tech: j.tech ?? classifyTech(j.title, j.description, j.kind),
            description: "",
          })),
        names,
      ).filter((j) => j.kind !== "competition" && j.tech?.families.length),
    };
  }
  const supabase = client();
  if (!supabase) throw new Error("Catalog unavailable");
  const { data, error } = await supabase.rpc("get_tech_catalog");
  if (
    error ||
    !data ||
    !Array.isArray(data.jobs) ||
    !Array.isArray(data.sources)
  )
    throw new Error("Catalog unavailable");
  return data;
}
export async function catalogSources() {
  return searchCatalog({
    q: "",
    city: "",
    contract: "",
    workplace: "",
    source: "",
    days: 0,
    page: 1,
    sort: "recent",
    kind: "",
  });
}
export async function getJob(id: string): Promise<{ job: Job | null }> {
  if (!/^[a-f0-9]{32}$/.test(id)) return { job: null };
  const local = await snapshot();
  if (local) {
    const permitted = local.sources.filter(
      (source) => source.enabled && source.publicationStatus !== "blocked",
    );
    const ids = new Set(permitted.map((source) => source.id));
    const jobs = groupListings(
      local.listings.filter(
        (job) =>
          job.active &&
          ids.has(job.source_id) &&
          deadlineOpen(job.deadline) &&
          Date.parse(job.last_seen_at) > Date.now() - 72 * 3600000,
      ),
      new Map(permitted.map((source) => [source.id, source.name])),
    );
    const job = jobs.find((job) => job.group_key === id);
    return { job: job ? { ...job, description: "" } : null };
  }
  const supabase = client();
  if (!supabase) return { job: null };
  const { data, error } = await supabase.rpc("get_catalog_job", { p_id: id });
  if (error) console.error("Job lookup failed", { code: error.code });
  if (error || !data) return { job: null };
  // Public column access and RLS apply to the same representative listing.
  const { data: metadata } = await supabase
    .from("listings")
    .select("tech")
    .eq("id", data.id)
    .maybeSingle();
  return { job: { ...data, tech: metadata?.tech ?? undefined } as Job };
}
