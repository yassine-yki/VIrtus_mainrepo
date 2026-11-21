/** Read-only audit. Store counts/evidence only; never publish or reconcile a partial board feed. */
import { mkdir, writeFile } from "node:fs/promises";
import { collectWikimedia } from "../src/collectors/remote-employers";
import { sources } from "../src/lib/sources";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const evidence: Record<string, unknown> = {
  at: new Date().toISOString(),
  himalayas: { enabled: false },
};
const source = sources.find((s) => s.id === "wikimedia")!;
const jobs = await collectWikimedia(source);
evidence.wikimedia = {
  complete: true,
  eligible: jobs.length,
  distinct: new Set(jobs.map((j) => j.group_key)).size,
  tech: jobs.filter((j) => j.tech?.families.length).length,
  recent30: jobs.filter(
    (j) =>
      j.published_at &&
      Date.parse(j.published_at) >= Date.now() - 30 * 86400000,
  ).length,
  techRecent30: jobs.filter(
    (j) =>
      j.tech?.families.length &&
      j.published_at &&
      Date.parse(j.published_at) >= Date.now() - 30 * 86400000,
  ).length,
  jobs: jobs.map((j) => ({
    id: j.id,
    group_key: j.group_key,
    title: j.title,
    url: j.url,
    published_at: j.published_at,
    tech: j.tech,
    description: j.description,
  })),
};
let expected: number | null = null;
const ids = new Set<string>();
let records = 0;
let pages = 0;
try {
  const firstIds: string[] = [];
  const base =
    "https://himalayas.app/jobs/api/search?country=MA&exclude_worldwide=true&sort=recent";
  async function page(n: number) {
    const r = await fetch(base + "&page=" + n, {
      signal: AbortSignal.timeout(25000),
      headers: { Accept: "application/json" },
    });
    if (!r.ok)
      throw new Error(
        "HTTP " +
          r.status +
          "; Retry-After=" +
          (r.headers.get("retry-after") ?? "unspecified") +
          "; audit stopped without reconciliation",
      );
    return r.json();
  }
  for (let n = 1; n <= 251; n++) {
    if (n > 1) await pause(3100);
    const data = await page(n);
    pages++;
    if (
      !Number.isSafeInteger(data.totalCount) ||
      data.totalCount < 0 ||
      !Array.isArray(data.jobs) ||
      data.limit !== 20 ||
      data.offset !== (n - 1) * 20
    )
      throw new Error("Malformed pagination metadata");
    expected ??= data.totalCount;
    if (expected === null || data.totalCount !== expected || expected > 5000)
      throw new Error("Unstable or unsupported total");
    if (n === 1)
      firstIds.push(...data.jobs.map((j: { guid: string }) => j.guid));
    for (const job of data.jobs) {
      records++;
      if (typeof job.guid !== "string" || !job.guid || ids.has(job.guid))
        throw new Error("Duplicate or missing guid on page " + n);
      ids.add(job.guid);
    }
    if (data.jobs.length < 20) {
      if (ids.size !== expected) throw new Error("Truncated feed");
      break;
    }
  }
  if (ids.size !== expected)
    throw new Error("Incomplete feed or safety limit reached");
  await pause(3100);
  const anchor = await page(1);
  if (
    anchor.totalCount !== expected ||
    JSON.stringify(anchor.jobs.map((j: { guid: string }) => j.guid)) !==
      JSON.stringify(firstIds)
  )
    throw new Error("Feed changed during traversal");
  evidence.himalayas = {
    enabled: false,
    complete: true,
    reported: expected,
    unique: ids.size,
    pages,
    note: "Technical audit only; eligibility and overlap require separate verification.",
  };
} catch (e) {
  evidence.himalayas = {
    enabled: false,
    complete: false,
    reported: expected,
    unique: ids.size,
    records,
    pages,
    error: e instanceof Error ? e.message : "Audit failed",
  };
}
await mkdir("data/audits", { recursive: true });
await writeFile(
  "data/audits/remote-morocco.json",
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence, null, 2));
