import test from "node:test";
import assert from "node:assert/strict";
import { collectWikimedia } from "../src/collectors/remote-employers";
import { sources } from "../src/lib/sources";
import {
  parseFilters,
  searchSnapshot,
  filtersUrl,
  catalogReturnUrl,
} from "../src/lib/search";
const source = sources.find((s) => s.id === "wikimedia")!;
const item = (id = 1) => ({
  id,
  title: "Senior Software Engineer",
  location: { name: "Remote" },
  absolute_url: "https://job-boards.greenhouse.io/wikimedia/jobs/" + id,
  first_published: "2026-11-10T10:00:00Z",
  updated_at: "2026-11-21T12:00:00Z",
  content:
    "&lt;p&gt;Required: Python. Fully remote team.&lt;/p&gt;&lt;p&gt;Countries: Brazil, Morocco, Netherlands and the United Kingdom. Our non-US employees must have current work authorization in their location.&lt;/p&gt;",
});
const feed = (jobs: unknown[]) => ({ meta: { total: jobs.length }, jobs });
test("audited remote policy retains original dates, evidence and facts, with no city or full ad", async () => {
  const [job] = await collectWikimedia(source, async () => feed([item()]));
  assert.equal(job.published_at, "2026-11-10T10:00:00.000Z");
  assert.equal(job.description, "");
  assert.deepEqual(job.city_keys, []);
  assert.deepEqual(job.locations, ["Maroc"]);
  assert.equal(job.tech?.eligibility, "remote-morocco");
  assert.equal(job.tech?.remoteEvidence?.workAuthorization, true);
  assert.deepEqual(job.tech?.requiredTechnologies, ["python"]);
  assert.equal(job.contract, "Non précisé");
  const missing = { ...item(), first_published: null };
  assert.equal(
    (await collectWikimedia(source, async () => feed([missing])))[0]
      .published_at,
    null,
  );
});
test("remote/EMEA/worldwide, incidental Morocco mentions and foreign-only roles never establish eligibility", async () => {
  const variants = [
    { ...item(), content: "Remote worldwide. Clients in Morocco." },
    {
      ...item(),
      content:
        "<p>Countries: Brazil, Netherlands and the United Kingdom.</p><p>Our partners operate in Morocco.</p>",
    },
    { ...item(), location: { name: "Remote - US" } },
    { ...item(), content: "<p>Location: Remote (US)</p>" + item().content },
    { ...item(), content: "<p>This role is US-only.</p>" + item().content },
    {
      ...item(),
      content: "<p>You must be based in France.</p>" + item().content,
    },
    { ...item(), application_deadline: "2020-01-01T12:00:00Z" },
  ];
  for (const j of variants)
    assert.equal(
      (await collectWikimedia(source, async () => feed([j]))).length,
      0,
    );
});
test("remote feed refuses incomplete totals, duplicate IDs, unsafe links and malformed metadata", async () => {
  for (const data of [
    { jobs: [item()] },
    { ...feed([item()]), meta: { total: 2 } },
    { ...feed([item()]), has_more: true },
    feed([item(), item()]),
    feed([{ ...item(), first_published: "bad" }]),
    feed([{ ...item(), absolute_url: "https://evil.example/1" }]),
    feed([{ ...item(), content: null }]),
  ])
    await assert.rejects(collectWikimedia(source, async () => data));
  await assert.rejects(
    collectWikimedia({ ...source, id: "other" }, async () => feed([item()])),
  );
});
test("remote filters retain date windows, pagination and original detail return path", async () => {
  const jobs = await collectWikimedia(source, async () =>
    feed(Array.from({ length: 25 }, (_, i) => item(i + 1))),
  );
  const now = Date.parse("2026-11-21T22:00:00Z");
  for (const job of jobs) job.last_seen_at = new Date(now).toISOString();
  const snapshot = {
    version: 1 as const,
    collected_at: new Date(now).toISOString(),
    sources: [{ ...source, publicationStatus: "approved" as const }],
    listings: jobs,
    runs: [],
  };
  const filters = parseFilters({
    tech: "1",
    workplace: "remote",
    page: "3",
    days: "0",
  });
  const result = searchSnapshot(snapshot, filters, false, now);
  assert.equal(result.total, 25);
  assert.equal(result.jobs.length, 1);
  assert.equal(catalogReturnUrl(filtersUrl(filters)), filtersUrl(filters));
  assert.equal(
    searchSnapshot(snapshot, { ...filters, city: "casablanca" }, false, now)
      .total,
    0,
  );
  assert.equal(
    searchSnapshot(
      {
        ...snapshot,
        listings: jobs.map((j) => ({ ...j, published_at: null })),
      },
      { ...filters, days: 30 },
      false,
      now,
    ).total,
    0,
  );
  assert.equal(
    searchSnapshot(
      {
        ...snapshot,
        sources: [{ ...source, publicationStatus: "blocked" as const }],
      },
      filters,
      false,
      now,
    ).total,
    0,
  );
});
