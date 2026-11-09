import test from "node:test";
import assert from "node:assert/strict";
import { normalizeListing } from "../src/lib/normalize";
import { sources } from "../src/lib/sources";
import {
  parseFilters,
  searchSnapshot,
  filtersUrl,
  catalogReturnUrl,
} from "../src/lib/search";
import type { CatalogSnapshot, Listing } from "../src/lib/types";
const now = new Date().toISOString();
test("detail return keeps the search, all-dates selection, sorting and page", () => {
  const filters = parseFilters({
    q: "développeur",
    days: "0",
    city: "rabat",
    kind: "job",
    page: "3",
    sort: "relevance",
  });
  assert.equal(catalogReturnUrl(filtersUrl(filters)), filtersUrl(filters));
});
test("detail return rejects external paths and strips unsupported parameters", () => {
  for (const value of [
    undefined,
    ["/?q=test"],
    "https://example.com/",
    "//example.com/",
    "/sources",
    "javascript:alert(1)",
  ]) {
    assert.equal(catalogReturnUrl(value), "/#offres");
  }
  const returned = catalogReturnUrl(
    "/?q=data&days=0&page=-1&redirect=https://example.com",
  );
  assert.equal(returned, "/?q=data&days=0#offres");
});
const source = { ...sources[2], publicationStatus: "approved" as const };
const job = (id: string, title = "Ingénieur développeur"): Listing =>
  normalizeListing(
    source,
    {
      externalId: id,
      title,
      location: "Rabat",
      url: `https://example.com/${id}`,
      contract: "Permanent",
      publishedAt: now,
    },
    now,
  )!;
const snapshot = (listings: Listing[]): CatalogSnapshot => ({
  version: 1,
  collected_at: now,
  sources: [source],
  listings,
  runs: [],
});
test("search reaches a matching job beyond the first page", () => {
  const jobs = Array.from({ length: 40 }, (_, i) =>
    job(String(i), i === 39 ? "Comptable unique" : "Ingénieur"),
  );
  const result = searchSnapshot(
    snapshot(jobs),
    parseFilters({ q: "unique" }),
    false,
  );
  assert.equal(result.total, 1);
  assert.equal(result.jobs[0].external_id, "39");
});
test("search ignores French accents and supports combined filters", () => {
  const result = searchSnapshot(
    snapshot([job("1")]),
    parseFilters({ q: "developpeur", city: "rabat", contract: "CDI" }),
    false,
  );
  assert.equal(result.total, 1);
});
test("pending and blocked sources stay hidden from public results", () => {
  const data = snapshot([job("1")]);
  data.sources[0] = { ...source, publicationStatus: "pending" };
  assert.equal(searchSnapshot(data, parseFilters({}), false).total, 0);
  assert.equal(searchSnapshot(data, parseFilters({}), true).total, 1);
  data.sources[0].publicationStatus = "blocked";
  assert.equal(searchSnapshot(data, parseFilters({}), true).total, 0);
});
test("stale records excluded; unknown publication dates do not match recent filter", () => {
  const stale = {
    ...job("1"),
    last_seen_at: new Date(Date.now() - 80 * 3600_000).toISOString(),
  };
  assert.equal(
    searchSnapshot(snapshot([stale]), parseFilters({}), false).total,
    0,
  );
  assert.equal(
    searchSnapshot(
      snapshot([{ ...job("2"), published_at: null }]),
      parseFilters({ days: "7" }),
      false,
    ).total,
    0,
  );
});
test("invalid parameters bounded and out-of-range pages clamp safely", () => {
  const filters = parseFilters({
    q: "a".repeat(500),
    page: "999999",
    workplace: "bad",
    days: "-3",
  });
  assert.equal(filters.q.length, 120);
  assert.equal(filters.page, 10000);
  assert.equal(filters.workplace, "");
  assert.equal(filters.days, 0);
  const result = searchSnapshot(
    snapshot([job("1")]),
    parseFilters({ page: "80" }),
    false,
  );
  assert.equal(result.page, 1);
  assert.equal(result.jobs.length, 1);
});

test("recent search is the default and explicit all dates survives navigation", () => {
  assert.equal(parseFilters({}).days, 30);
  const old = {
    ...job("old"),
    published_at: new Date(Date.now() - 100 * 86400_000).toISOString(),
  };
  const undated = { ...job("undated"), published_at: null };
  const data = snapshot([old, undated, job("new")]);
  assert.equal(searchSnapshot(data, parseFilters({}), false).total, 1);
  assert.equal(
    searchSnapshot(data, parseFilters({ days: "0" }), false).total,
    3,
  );
  const url = new URL(
    filtersUrl(parseFilters({ days: "0" }), { page: 2 }),
    "https://virtus.test",
  );
  assert.equal(url.searchParams.get("days"), "0");
  assert.equal(parseFilters(Object.fromEntries(url.searchParams)).days, 0);
});
