import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { searchSnapshot, PAGE_SIZE, groupListings } from "./search";
import { deadlineOpen } from "./deadline";
import type { CatalogSnapshot, Filters, Job, SearchResult } from "./types";

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
  return { job: error ? null : (data as Job | null) };
}
