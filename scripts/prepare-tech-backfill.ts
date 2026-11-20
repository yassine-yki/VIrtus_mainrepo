/** Prepare metadata only; no credentials, refresh timestamps or source states are changed. */
import { readFile, writeFile } from "node:fs/promises";
import { classifyTech } from "../src/lib/tech";
const rows: { id: string; title: string; kind: string }[] = JSON.parse(
  await readFile("data/tech-backfill-input.json", "utf8"),
);
const jobs = rows.map((row) => ({
  id: row.id,
  tech: classifyTech(row.title, "", row.kind),
}));
await writeFile("data/tech-backfill-output.json", JSON.stringify(jobs));
console.log(
  JSON.stringify({
    rows: jobs.length,
    tech: jobs.filter((j) => j.tech.families.length).length,
    classificationVersion: 1,
  }),
);
