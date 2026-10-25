import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { collectSource } from "../src/collectors/connectors";
import { sources } from "../src/lib/sources";
import type { CatalogSnapshot, Listing, SyncReport } from "../src/lib/types";

const args = process.argv.slice(2);
const snapshotOnly = args.includes("--snapshot");
const selected = args
  .find((arg) => arg.startsWith("--only="))
  ?.slice(7)
  .split(",");
if (selected?.some((id) => !sources.some((source) => source.id === id)))
  throw new Error("Unknown --only source identifier");
if (process.env.COLLECTION_ENABLED === "false") {
  console.log("Collection disabled");
  process.exit(0);
}
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!snapshotOnly && (!url || !secret))
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY, or use --snapshot for local review",
  );
const supabase =
  !snapshotOnly && url && secret
    ? createClient(url, secret, { auth: { persistSession: false } })
    : null;
const path = resolve(process.env.LOCAL_CATALOG_PATH || "data/catalog.json");
if (process.env.CI && (!selected || selected.length !== 1))
  throw new Error("CI collection requires exactly one --only source");
const writeSnapshot = !process.env.CI;
let previous: CatalogSnapshot | null = null;
try {
  previous = JSON.parse(await readFile(path, "utf8"));
} catch {
  /* First import. */
}
const listings = new Map<string, Listing>(
  (previous?.listings ?? []).map((job) => [job.id, job]),
);
const reports = new Map<string, SyncReport>(
  (previous?.runs ?? []).map((run) => [run.source_id, run]),
);
let failures = 0;
for (const source of sources.filter(
  (source) =>
    source.enabled &&
    source.publicationStatus !== "blocked" &&
    (!selected || selected.includes(source.id)),
)) {
  const startedAt = new Date().toISOString();
  console.log(`Collecting ${source.name}…`);
  try {
    if (supabase) {
      const { data: permitted, error } = await supabase.rpc("register_source", {
        p_source: source,
      });
      if (error) throw new Error(`Source registration failed (${error.code})`);
      if (!permitted) {
        const { error: logError } = await supabase
          .from("sync_runs")
          .insert({
            source_id: source.id,
            status: "skipped",
            count: 0,
            started_at: startedAt,
            error: "Source disabled or blocked",
          });
        if (logError)
          throw new Error(`Skip log unavailable (${logError.code})`);
        console.log("  Skipped: source disabled or blocked in database");
        continue;
      }
    }
    const jobs = await collectSource(source);
    const old = [...listings.values()].filter(
      (job) => job.source_id === source.id && job.active,
    );
    if (old.length >= 10 && jobs.length < old.length * 0.5)
      throw new Error("Suspicious source drop; preserving previous listings");
    if (supabase) {
      const { error } = await supabase.rpc("commit_source_sync", {
        p_source: source,
        p_jobs: jobs,
        p_started_at: startedAt,
      });
      if (error) throw new Error(`Database sync failed (${error.code})`);
    }
    // A local snapshot is a review export, not the authoritative expiry ledger.
    for (const [id, job] of listings)
      if (job.source_id === source.id) listings.delete(id);
    for (const job of jobs)
      listings.set(job.id, {
        ...job,
        first_seen_at:
          previous?.listings.find((oldJob) => oldJob.id === job.id)
            ?.first_seen_at ?? startedAt,
      });
    reports.set(source.id, {
      source_id: source.id,
      source_name: source.name,
      status: "success",
      count: jobs.length,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });
    console.log(`  ${jobs.length} Morocco listings`);
  } catch (error) {
    failures++;
    const message =
      error instanceof Error ? error.message : "Unknown collection failure";
    const report: SyncReport = {
      source_id: source.id,
      source_name: source.name,
      status: "failed",
      count: 0,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      error: message,
    };
    reports.set(source.id, report);
    console.error(`  ${source.name}: ${message}`);
    // Failed sources never call the reconciliation function or expire records.
    if (supabase) {
      const { error: logError } = await supabase.from("sync_runs").insert({
        source_id: source.id,
        status: "failed",
        count: 0,
        started_at: startedAt,
        error: message,
      });
      if (logError)
        console.error(`  Failure log unavailable (${logError.code})`);
    }
  }
}
const snapshot: CatalogSnapshot = {
  version: 1,
  collected_at: new Date().toISOString(),
  sources,
  listings: [...listings.values()],
  runs: [...reports.values()],
};
if (writeSnapshot) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(snapshot), "utf8");
  await rename(`${path}.tmp`, path);
}
console.log(
  `Processed ${snapshot.listings.length} listings; ${failures} source failures.`,
);
if (failures) process.exitCode = 1;
