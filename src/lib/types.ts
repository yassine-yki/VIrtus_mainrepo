export type Provider = "smartrecruiters" | "greenhouse" | "lever" | "html";
export type Workplace = "onsite" | "hybrid" | "remote" | "unknown";
export type Contract =
  | "CDI"
  | "CDD"
  | "Stage"
  | "Freelance"
  | "Intérim"
  | "Non précisé";
export type PublicationStatus = "pending" | "approved" | "blocked";

export interface Source {
  id: string;
  name: string;
  company: string;
  provider: Provider;
  identifier: string;
  website: string;
  enabled: boolean;
  publicationStatus: PublicationStatus;
  permissionNote: string;
}

export interface Listing {
  id: string;
  group_key: string;
  source_id: string;
  external_id: string;
  company: string;
  title: string;
  description: string;
  locations: string[];
  city_keys: string[];
  country: "MA";
  workplace: Workplace;
  contract: Contract;
  employment: string | null;
  salary: string | null;
  url: string;
  published_at: string | null;
  first_seen_at?: string;
  last_seen_at: string;
  active: boolean;
}

export interface Job extends Listing {
  sources: { id: string; name: string; url: string }[];
}

export interface SyncReport {
  source_id: string;
  source_name: string;
  status: "success" | "failed" | "skipped";
  count: number;
  started_at: string;
  finished_at: string;
  error?: string;
}

export interface CatalogSnapshot {
  version: 1;
  collected_at: string;
  sources: Source[];
  listings: Listing[];
  runs: SyncReport[];
}

export interface Filters {
  q: string;
  city: string;
  contract: string;
  workplace: string;
  source: string;
  days: number;
  page: number;
  sort: "recent" | "relevance";
}

export interface SearchResult {
  jobs: Job[];
  total: number;
  page: number;
  pageSize: number;
  cities: { key: string; name: string; count: number }[];
  companies: number;
  sources: {
    id: string;
    name: string;
    count: number;
    checked_at: string | null;
  }[];
  checked_at: string | null;
  mode: "supabase" | "snapshot" | "unconfigured";
  review?: boolean;
  error?: string;
}
