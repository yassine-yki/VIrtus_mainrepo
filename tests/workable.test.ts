import test from "node:test";
import assert from "node:assert/strict";
import { collectWorkable } from "../src/collectors/connectors";
import { sources } from "../src/lib/sources";
const source = sources.find((source) => source.id === "mindera")!;
const item = {
  shortcode: "ABC123",
  title: "Software &amp; Data Engineer",
  url: "https://apply.workable.com/j/ABC123",
  published_on: "2026-11-02",
  created_at: "2024-01-01",
  employment_type: "Full time",
  telecommuting: true,
  locations: [
    { countryCode: "MA", country: "Morocco", city: "", hidden: false },
  ],
};
const feed = { name: "Mindera", jobs: [item] };
test("Workable merges location variants into one job without adding foreign cities", async () => {
  const jobs = await collectWorkable(source, async () => ({
    ...feed,
    jobs: [
      { ...item, locations: [{ countryCode: "FR", city: "Paris" }] },
      { ...item, locations: [{ countryCode: "MA", city: "Casablanca" }] },
      { ...item, locations: [{ countryCode: "MA", city: "Rabat" }] },
      { ...item, locations: [{ countryCode: "MA", city: "Rabat" }] },
    ],
  }));
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].locations, ["Casablanca", "Rabat"]);
  assert.deepEqual(jobs[0].city_keys, ["casablanca", "rabat"]);
});
test("Workable uses the complete public metadata feed and original links", async () => {
  const calls: string[] = [];
  const jobs = await collectWorkable(source, async (url) => {
    calls.push(url);
    return feed;
  });
  assert.deepEqual(calls, [
    "https://apply.workable.com/api/v1/widget/accounts/minderacraft",
  ]);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "Software & Data Engineer");
  assert.deepEqual(jobs[0].locations, ["Maroc"]);
  assert.deepEqual(jobs[0].city_keys, []);
  assert.equal(jobs[0].contract, "Non précisé");
  assert.equal(jobs[0].workplace, "remote");
  assert.equal(jobs[0].description, "");
  assert.equal(jobs[0].published_at, "2026-11-02T00:00:00.000Z");
  assert.equal(jobs[0].url, item.url);
});
test("Workable rejects malformed, paginated, truncated and duplicate feeds", async () => {
  for (const data of [
    { error: "blocked" },
    { ...feed, name: "Another employer" },
    { ...feed, has_more: true },
    { ...feed, next: "https://evil.test" },
    { ...feed, next_page: 2 },
    { ...feed, total: 2 },
    { ...feed, jobs: Array(1000).fill(item) },
    { ...feed, jobs: [item, { ...item, title: "Different role" }] },
    { ...feed, jobs: [{ ...item, locations: { countryCode: "MA" } }] },
    { ...feed, jobs: [{ ...item, published_on: "2026-02-30" }] },
    { ...feed, jobs: [{ ...item, url: "https://evil.test/j/ABC123" }] },
  ])
    await assert.rejects(collectWorkable(source, async () => data));
});
test("Workable requires an explicit visible Morocco location and preserves unknown dates", async () => {
  for (const locations of [
    [{ country: "Worldwide", city: "Remote" }],
    [{ countryCode: "FR", city: "Paris" }],
    [{ countryCode: "FR", country: "Morocco", city: "Paris" }],
    [{ countryCode: "MA", hidden: true }],
    [],
  ])
    assert.equal(
      (
        await collectWorkable(source, async () => ({
          ...feed,
          jobs: [{ ...item, locations }],
        }))
      ).length,
      0,
    );
  const jobs = await collectWorkable(source, async () => ({
    ...feed,
    jobs: [
      {
        ...item,
        published_on: null,
        locations: [
          { countryCode: "FR", city: "Paris" },
          { countryCode: "MA", city: "Casablanca" },
          { countryCode: "MA", city: "Rabat" },
        ],
      },
    ],
  }));
  assert.equal(jobs[0].published_at, null);
  assert.deepEqual(jobs[0].city_keys, ["casablanca", "rabat"]);
});
