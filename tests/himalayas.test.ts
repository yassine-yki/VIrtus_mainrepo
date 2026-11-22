import test from "node:test";
import assert from "node:assert/strict";
import {
  collectHimalayas,
  coverageEvidence,
} from "../src/collectors/himalayas";
import { sources } from "../src/lib/sources";
import { listingVisible, canExportSource } from "../src/lib/source-policy";
const source = sources.find((s) => s.id === "himalayas")!;
const now = Date.parse("2026-11-21T22:00:00Z");
const item = (i = 1) => ({
  guid: "https://himalayas.app/companies/example/jobs/software-" + i,
  applicationLink:
    "https://himalayas.app/companies/example/jobs/software-" +
    i +
    "?utm_source=api",
  title: "Senior Software Engineer Python",
  companyName: "Example",
  description: "Python required. Remote role.",
  locationRestrictions: ["Morocco"],
  timezoneRestrictions: [0, 1],
  pubDate: Math.floor((now - 86400000) / 1000),
  expiryDate: Math.floor((now + 86400000) / 1000),
});
const get =
  (count: number, total = count) =>
  async (url: string) => {
    const p = Number(new URL(url).searchParams.get("page"));
    return {
      totalCount: total,
      limit: 20,
      offset: (p - 1) * 20,
      jobs: Array.from(
        { length: Math.max(0, Math.min(20, count - (p - 1) * 20)) },
        (_, i) => item((p - 1) * 20 + i + 1),
      ),
    };
  };
const wait = async () => {};
test("Himalayas accepts the observed 98.7% feed and an exact 95% boundary, not lower coverage", async () => {
  assert.equal(coverageEvidence(1265, 1249).partial, true);
  assert.equal(coverageEvidence(20, 19).coverage, 0.95);
  assert.throws(() => coverageEvidence(100, 94), /95%/);
  assert.throws(() => coverageEvidence(0, 0));
  const batch = await collectHimalayas(source, get(19, 20), wait, now);
  assert.equal(batch.jobs.length, 19);
  assert.equal(batch.evidence?.partial, true);
  assert.equal(batch.jobs[0].published_at, null);
  assert.equal(batch.jobs[0].url, item().applicationLink);
  assert.equal(batch.jobs[0].description, "");
  assert.deepEqual(batch.jobs[0].city_keys, []);
  assert.equal(
    batch.jobs[0].tech?.remoteEvidence?.sourceUpdatedAt,
    new Date(now - 86400000).toISOString(),
  );
  await assert.rejects(collectHimalayas(source, get(18, 20), wait, now), /95%/);
});
test("overlapping records are deduplicated; a tail request failure is accepted only after 95%", async () => {
  const batch = await collectHimalayas(
    source,
    async (url) => {
      const p = Number(new URL(url).searchParams.get("page"));
      return {
        totalCount: 20,
        limit: 20,
        offset: (p - 1) * 20,
        jobs:
          p === 1
            ? [...Array.from({ length: 19 }, (_, i) => item(i + 1)), item(1)]
            : [],
      };
    },
    wait,
    now,
  );
  assert.equal(batch.jobs.length, 19);
  const normal = get(100, 105);
  const partial = await collectHimalayas(
    source,
    async (url) => {
      if (url.endsWith("page=6")) throw new Error("HTTP 429");
      return normal(url);
    },
    wait,
    now,
  );
  assert.equal(partial.evidence?.observed, 100);
  await assert.rejects(
    collectHimalayas(
      source,
      async () => {
        throw new Error("HTTP 429");
      },
      wait,
      now,
    ),
  );
});
test("partial tolerance does not accept malformed pagination, unsafe links, invalid expiry or foreign-only roles", async () => {
  const valid = { totalCount: 1, limit: 20, offset: 0, jobs: [item()] };
  for (const data of [
    { ...valid, offset: 1 },
    { ...valid, totalCount: "1" },
    { ...valid, jobs: [{ ...item(), expiryDate: null }] },
    {
      ...valid,
      jobs: [{ ...item(), applicationLink: "https://evil.example/job" }],
    },
  ])
    await assert.rejects(collectHimalayas(source, async () => data, wait, now));
  for (const job of [
    { ...item(), locationRestrictions: ["EMEA", "Worldwide"] },
    { ...item(), description: "US-only position. Python required." },
    { ...item(), description: "This is an on-site role. Python required." },
    { ...item(), expiryDate: Math.floor((now - 1) / 1000) },
    { ...item(), title: "Marketing Manager" },
  ])
    assert.equal(
      (
        await collectHimalayas(
          source,
          async () => ({ ...valid, jobs: [job] }),
          wait,
          now,
        )
      ).jobs.length,
      0,
    );
});
test("unseen partial-source jobs survive while the source is healthy, expire independently, and cannot enter exports", async () => {
  const job = (await collectHimalayas(source, get(1), wait, now)).jobs[0];
  job.last_seen_at = new Date(now - 10 * 86400000).toISOString();
  assert.equal(listingVisible(job, new Date(now).toISOString(), now), true);
  assert.equal(
    listingVisible(
      { ...job, expires_at: new Date(now - 1).toISOString() },
      new Date(now).toISOString(),
      now,
    ),
    false,
  );
  assert.equal(
    listingVisible(job, new Date(now - 4 * 86400000).toISOString(), now),
    false,
  );
  assert.equal(canExportSource(job.source_id), false);
  assert.equal(canExportSource("wikimedia"), true);
});
