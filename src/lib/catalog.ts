import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { searchSnapshot, PAGE_SIZE } from "./search";
import type { CatalogSnapshot, Filters, Job, SearchResult } from "./types";
import { cookies } from "next/headers";
import { equalSecret, reviewCookieValue, reviewEnabled } from "./review-auth";

export function isLocalReview(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CATALOG_AUDIENCE !== "public"
  );
}
async function authorizedReview(): Promise<boolean> {
  if (!reviewEnabled()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  const value = (await cookies()).get("virtus_review")?.value ?? "";
  return equalSecret(
    value,
    reviewCookieValue(process.env.VIRTUS_REVIEW_TOKEN!),
  );
}
const empty = (filters: Filters, error?: string): SearchResult => ({
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
  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && apiKey
    ? createClient(url, apiKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}

async function snapshot(): Promise<CatalogSnapshot | null> {
  if (!isLocalReview()) return null;
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
  if (local) return searchSnapshot(local, filters, true);
  const supabase = client();
  if (!supabase) return empty(filters);
  const review = await authorizedReview();
  const { data, error } = await supabase.rpc(
    review ? "search_catalog_review" : "search_catalog",
    {
      ...(review ? { p_token: process.env.VIRTUS_REVIEW_TOKEN } : {}),
      p_query: filters.q,
      p_city: filters.city,
      p_contract: filters.contract,
      p_workplace: filters.workplace,
      p_source: filters.source,
      p_days: filters.days,
      p_page: filters.page,
      p_sort: filters.sort,
    },
  );
  if (error) {
    console.error("Catalog search failed", { code: error.code });
    return empty(
      filters,
      "La recherche est momentanément indisponible. Réessayez dans quelques instants.",
    );
  }
  return { ...data, mode: "supabase", review } as SearchResult;
}

export async function getJob(
  id: string,
): Promise<{ job: Job | null; internal: boolean }> {
  if (!/^[a-f0-9]{32}$/.test(id)) return { job: null, internal: false };
  const local = await snapshot();
  if (local) {
    const result = searchSnapshot(
      local,
      {
        q: "",
        city: "",
        contract: "",
        workplace: "",
        source: "",
        days: 0,
        page: 1,
        sort: "recent",
      },
      true,
    );
    // Details must search the full catalog, not only the first page.
    for (
      let page = 1;
      page <= Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      page++
    ) {
      const found = searchSnapshot(
        local,
        {
          q: "",
          city: "",
          contract: "",
          workplace: "",
          source: "",
          days: 0,
          page,
          sort: "recent",
        },
        true,
      ).jobs.find((job) => job.group_key === id);
      if (found) return { job: found, internal: true };
    }
    return { job: null, internal: true };
  }
  const supabase = client();
  if (!supabase) return { job: null, internal: false };
  const review = await authorizedReview();
  const { data, error } = await supabase.rpc(
    review ? "get_catalog_job_review" : "get_catalog_job",
    {
      p_id: id,
      ...(review ? { p_token: process.env.VIRTUS_REVIEW_TOKEN } : {}),
    },
  );
  if (error) console.error("Job lookup failed", { code: error.code });
  return { job: error ? null : (data as Job | null), internal: review };
}
