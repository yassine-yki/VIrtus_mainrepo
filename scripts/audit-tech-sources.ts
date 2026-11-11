import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collectSource } from "../src/collectors/connectors";
import { fetchJson, fetchText, postJson } from "../src/collectors/http";
import { sources } from "../src/lib/sources";
import definitions from "../src/lib/tech-employers.json";

// Manual evidence refresh, independent of database collection/publication.
const records: Array<{ id: string } & Record<string, unknown>> = [];
const listings = [];
const selected = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.slice(7)
  .split(",");
if (selected?.some((id) => !definitions.some((source) => source.id === id)))
  throw new Error("Unknown audit source");
for (const definition of definitions) {
  if (selected && !selected.includes(definition.id)) continue;
  const source = sources.find((item) => item.id === definition.id)!;
  let requests = 0;
  const jobs = await collectSource(
    source,
    async (url) => {
      requests++;
      return fetchJson(url);
    },
    async (url) => {
      requests++;
      return fetchText(url);
    },
    async (url, body) => {
      requests++;
      return postJson(url, body);
    },
  );
  const distinct = new Set(jobs.map((job) => job.group_key));
  const recent = jobs.filter(
    (job) =>
      job.published_at &&
      Date.parse(job.published_at) >= Date.now() - 30 * 86400_000,
  );
  records.push({
    ...definition,
    checkedAt: new Date().toISOString(),
    moroccoCount: jobs.length,
    distinctJobs: distinct.size,
    recentCount: recent.length,
    paginationComplete: true,
    apiRequests: requests,
  });
  listings.push(...jobs.map((job) => ({ ...job, description: "" })));
  console.log(
    JSON.stringify({
      source: source.id,
      morocco: jobs.length,
      distinct: distinct.size,
      recent: recent.length,
      requests,
    }),
  );
}
await writeFile(
  new URL("../src/lib/tech-employers.json", import.meta.url),
  JSON.stringify(
    definitions.map(
      (definition) =>
        records.find((record) => record.id === definition.id) ?? definition,
    ),
    null,
    2,
  ) + "\n",
);
await mkdir(new URL("../.local/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../.local/tech-feed-audit.json", import.meta.url),
  JSON.stringify({ records, listings }, null, 2),
);
console.log(
  JSON.stringify({
    distinct: new Set(listings.map((job) => job.group_key)).size,
  }),
);
