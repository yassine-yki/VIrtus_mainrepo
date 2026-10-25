import test from "node:test";
import assert from "node:assert/strict";
import { collectWadifa } from "../src/collectors/connectors";
import { retryDelay } from "../src/collectors/http";
import { sources } from "../src/lib/sources";
import { casablancaDate, deadlineOpen, dateOnly } from "../src/lib/deadline";
import { searchSnapshot, parseFilters, filtersUrl } from "../src/lib/search";
const board = sources.find((source) => source.id === "wadifa")!;
const fixture = {
  attribution: { license: "CC-BY-4.0" },
  count: 1,
  items: [
    {
      id: 1,
      grade: "Administrateur",
      employer: "École de Rabat",
      posts: 2,
      published: "2026-10-24",
      deadline: "2026-11-09",
      url: "https://www.wadifa-info.com/fr/1",
      official_notice: "https://www.emploi-public.ma/fr/concours/details/1",
    },
  ],
};
test("Wadifa maps metadata, preserves attribution, and does not infer a city or CDI", async () => {
  const calls: string[] = [];
  const jobs = await collectWadifa(board, async (url) => {
    calls.push(url);
    return fixture;
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /lang=fr&limit=2000$/);
  const job = jobs[0];
  assert.equal(job.company, "École de Rabat");
  assert.deepEqual(job.locations, ["Maroc"]);
  assert.deepEqual(job.city_keys, []);
  assert.equal(job.contract, "Non précisé");
  assert.equal(job.kind, "competition");
  assert.equal(job.positions, 2);
  assert.equal(job.description, "");
  assert.equal(job.attribution_url, fixture.items[0].url);
  assert.equal(job.url, fixture.items[0].official_notice);
  const snapshot = {
    version: 1 as const,
    collected_at: job.last_seen_at,
    sources: [{ ...board, publicationStatus: "approved" as const }],
    listings: jobs,
    runs: [],
  };
  const now = Date.parse("2026-10-25T12:00:00Z");
  // Use a matching observation time so freshness is independent of the host date.
  job.last_seen_at = new Date(now).toISOString();
  assert.equal(
    searchSnapshot(snapshot, parseFilters({ kind: "competition" }), false, now)
      .total,
    1,
  );
  assert.equal(
    searchSnapshot(snapshot, parseFilters({ kind: "job" }), false, now).total,
    0,
  );
  assert.equal(
    searchSnapshot(snapshot, parseFilters({ city: "rabat" }), false, now).total,
    0,
  );
  assert.match(
    filtersUrl(parseFilters({ kind: "competition" }), { page: 2 }),
    /kind=competition/,
  );
});
test("Wadifa rejects malformed, changed licence, missing metadata, duplicate and truncated feeds", async () => {
  for (const data of [
    { ...fixture, count: 2 },
    { ...fixture, attribution: { license: "changed" } },
    { ...fixture, items: [{ ...fixture.items[0], deadline: "2026-02-30" }] },
    { ...fixture, items: [{ ...fixture.items[0], posts: null }] },
    {
      ...fixture,
      items: [{ ...fixture.items[0], official_notice: "https://evil.test/a" }],
    },
    { ...fixture, count: 2, items: [fixture.items[0], fixture.items[0]] },
    { ...fixture, count: 2000, items: Array(2000).fill(fixture.items[0]) },
  ]) {
    await assert.rejects(collectWadifa(board, async () => data));
  }
});
test("Wadifa quarantines records without employer or deadline without inventing metadata", async () => {
  const jobs = await collectWadifa(board, async () => ({
    ...fixture,
    count: 2,
    items: [
      fixture.items[0],
      { ...fixture.items[0], id: 2, employer: "", deadline: null },
    ],
  }));
  assert.equal(jobs.length, 1);
  await assert.rejects(
    collectWadifa(board, async () => ({
      ...fixture,
      items: [{ ...fixture.items[0], employer: "", deadline: null }],
    })),
    /No publishable/,
  );
});
test("Casablanca date deadlines include their final local day across seasonal offsets", () => {
  assert.equal(
    casablancaDate(Date.parse("2026-01-10T23:00:00Z")),
    "2026-01-11",
  );
  assert.equal(
    casablancaDate(Date.parse("2026-03-10T23:00:00Z")),
    "2026-03-10",
  );
  assert.equal(
    deadlineOpen("2026-01-10", Date.parse("2026-01-10T22:59:59Z")),
    true,
  );
  assert.equal(
    deadlineOpen("2026-01-10", Date.parse("2026-01-10T23:00:00Z")),
    false,
  );
  assert.equal(
    deadlineOpen("2026-03-10", Date.parse("2026-03-10T23:59:59Z")),
    true,
  );
  assert.equal(
    deadlineOpen("2026-03-10", Date.parse("2026-03-11T00:00:00Z")),
    false,
  );
  assert.equal(dateOnly("2026-02-30"), null);
  assert.equal(dateOnly("2026-2-03"), null);
});
test("Wadifa retry timing never violates the one-request-per-minute policy", () => {
  assert.equal(retryDelay("www.wadifa-info.com", 0, null), 61000);
  assert.equal(retryDelay("www.wadifa-info.com", 1, "90"), 90000);
  const now = Date.parse("2026-10-25T12:00:00Z");
  assert.equal(
    retryDelay("www.wadifa-info.com", 0, "Sun, 25 Oct 2026 12:02:00 GMT", now),
    120000,
  );
  assert.equal(retryDelay("api.lever.co", 1, "120"), 120000);
});
