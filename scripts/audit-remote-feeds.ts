/** Read-only audit. A 95% discovery result is accepted, but this script never publishes or reconciles records. */
import { mkdir, writeFile } from "node:fs/promises";
import {
  collectHimalayas,
  HIMALAYAS_MIN_COVERAGE,
} from "../src/collectors/himalayas";
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
try {
  const batch = await collectHimalayas(
    sources.find((s) => s.id === "himalayas")!,
  );
  evidence.himalayas = {
    auditOnly: true,
    accepted: true,
    minimumCoverage: HIMALAYAS_MIN_COVERAGE,
    ...batch.evidence,
    eligibleTech: batch.jobs.length,
    unknownPublicationDates: batch.jobs.filter((j) => !j.published_at).length,
  };
} catch (error) {
  evidence.himalayas = {
    auditOnly: true,
    accepted: false,
    error: error instanceof Error ? error.message : "Audit failed",
  };
}
await mkdir("data/audits", { recursive: true });
await writeFile(
  "data/audits/remote-morocco.json",
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence, null, 2));
