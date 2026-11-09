import test from "node:test";
import assert from "node:assert/strict";
import { collectAshby } from "../src/collectors/ashby";
import type { Source } from "../src/lib/types";
const source: Source = {
  id: "example",
  name: "Example",
  company: "Example",
  provider: "ashby",
  identifier: "example",
  website: "https://jobs.ashbyhq.com/example",
  enabled: false,
  publicationStatus: "pending",
  permissionNote: "Test only",
};
const id = "11111111-1111-4111-8111-111111111111";
const item = () => ({
  id,
  title: "Software &amp; Data Engineer",
  location: "Rabat",
  address: {
    postalAddress: { addressCountry: "Morocco", addressLocality: "Rabat" },
  },
  secondaryLocations: [],
  isListed: true,
  workplaceType: "Remote",
  employmentType: "FullTime",
  publishedAt: "2026-11-01T10:00:00Z",
  jobUrl: `https://jobs.ashbyhq.com/example/${id}`,
  descriptionPlain: "Do not persist this full advertisement",
});
test("Ashby maps real dates and metadata without persisting full ads or inferring CDI", async () => {
  const urls: string[] = [];
  const jobs = await collectAshby(source, async (url) => {
    urls.push(url);
    return { apiVersion: "1", jobs: [item()] };
  });
  assert.equal(urls.length, 1);
  assert.equal(jobs[0].title, "Software & Data Engineer");
  assert.equal(jobs[0].description, "");
  assert.equal(jobs[0].contract, "Non précisé");
  assert.equal(jobs[0].workplace, "remote");
  assert.equal(jobs[0].published_at, "2026-11-01T10:00:00.000Z");
});
test("Ashby includes secondary Morocco locations only, respects explicit foreign countries and skips unlisted jobs", async () => {
  const base = item();
  const jobs = await collectAshby(source, async () => ({
    apiVersion: "1",
    jobs: [
      {
        ...base,
        location: "Paris",
        address: { postalAddress: { addressCountry: "France" } },
        secondaryLocations: [
          {
            location: "Casablanca",
            address: {
              postalAddress: {
                addressCountry: "Morocco",
                addressLocality: "Casablanca",
              },
            },
          },
          {
            location: "Rabat",
            address: { postalAddress: { addressCountry: "France" } },
          },
        ],
      },
    ],
  }));
  assert.deepEqual(jobs[0].locations, ["Casablanca"]);
  for (const location of ["Remote - Worldwide", "EMEA", "Paris"]) {
    const rows = await collectAshby(source, async () => ({
      apiVersion: "1",
      jobs: [{ ...base, location, address: {} }],
    }));
    assert.equal(rows.length, 0);
  }
  assert.equal(
    (
      await collectAshby(source, async () => ({
        apiVersion: "1",
        jobs: [{ ...base, isListed: false }],
      }))
    ).length,
    0,
  );
});
test("Ashby preserves country-only and unknown-date records without inventing city matches", async () => {
  const jobs = await collectAshby(source, async () => ({
    apiVersion: "1",
    jobs: [{ ...item(), location: "Morocco", address: {}, publishedAt: null }],
  }));
  assert.deepEqual(jobs[0].locations, ["Maroc"]);
  assert.deepEqual(jobs[0].city_keys, []);
  assert.equal(jobs[0].published_at, null);
});
test("Ashby refuses incomplete, duplicate, malformed and unsafe responses", async () => {
  const valid = { apiVersion: "1", jobs: [item()] };
  for (const data of [
    { error: "unavailable" },
    { ...valid, apiVersion: "2" },
    { ...valid, total: 2 },
    { ...valid, nextPage: "cursor" },
    { ...valid, jobs: [item(), item()] },
    { ...valid, jobs: [{ ...item(), isListed: undefined }] },
    { ...valid, jobs: [{ ...item(), publishedAt: "not a date" }] },
    { ...valid, jobs: [{ ...item(), secondaryLocations: {} }] },
    { ...valid, jobs: [{ ...item(), jobUrl: "https://evil.example/job" }] },
  ])
    await assert.rejects(collectAshby(source, async () => data));
});
