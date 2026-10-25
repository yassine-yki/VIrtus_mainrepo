// Local, bounded exports for an operator-assisted initial review import.
// This command never exports .env values or credentials.
import { readFile } from "node:fs/promises";
import type { CatalogSnapshot, Listing } from "../src/lib/types";
const snapshot = JSON.parse(
  await readFile("data/catalog.json", "utf8"),
) as CatalogSnapshot;
const batches: Listing[][] = [];
let batch: Listing[] = [],
  length = 0;
for (const job of snapshot.listings) {
  const size = JSON.stringify(job).length;
  if (length + size > 45000 && batch.length) {
    batches.push(batch);
    batch = [];
    length = 0;
  }
  batch.push(job);
  length += size;
}
if (batch.length) batches.push(batch);
const index = Number(process.argv[2]);
console.log(
  JSON.stringify(
    Number.isInteger(index)
      ? { jobs: batches[index], batchCount: batches.length }
      : {
          sources: snapshot.sources,
          runs: snapshot.runs,
          batchCount: batches.length,
          count: snapshot.listings.length,
        },
  ),
);
