import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryUrl,
  catalogCategories,
  activeCategory,
  hasCatalogContext,
} from "../src/lib/catalog-navigation";
import { parseFilters, filtersUrl, catalogReturnUrl } from "../src/lib/search";

test("category navigation carries common context and resets incompatible destination constraints", () => {
  const previous = parseFilters({
    q: "développeur Python",
    city: "rabat",
    days: "0",
    sort: "relevance",
    page: "5",
    source: "devoteam",
    contract: "CDI",
    workplace: "hybrid",
    kind: "job",
    tech: "1",
    family: "software",
    technology: ["python", "sql"],
    seniority: "senior",
    pfe: "1",
    language: ["fr", "en"],
  });
  const expected = {
    jobs: { kind: "job" },
    tech: { kind: "job", tech: "1" },
    internships: { kind: "job", contract: "Stage" },
    competitions: { kind: "competition" },
    remote: { kind: "job", workplace: "remote" },
  };
  for (const category of catalogCategories) {
    const href = categoryUrl(previous, category.id),
      url = new URL(href, "https://virtus.invalid");
    const next = parseFilters(Object.fromEntries(url.searchParams));
    assert.equal(url.pathname, category.id === "tech" ? "/tech" : "/");
    assert.equal(url.hash, "#offres");
    assert.deepEqual(next, {
      ...parseFilters({
        q: previous.q,
        city: previous.city,
        days: "0",
        sort: "relevance",
      }),
      ...expected[category.id],
    });
    assert.equal(catalogReturnUrl(href), href);
  }
  assert.equal(previous.page, 5);
  assert.equal(previous.technology, "python,sql");
});
test("default category links keep the thirty-day window and ordinary filter operations retain tech context", () => {
  const defaults = parseFilters({});
  for (const category of catalogCategories)
    assert.match(categoryUrl(defaults, category.id), /days=30/);
  const f = parseFilters({
    tech: "1",
    kind: "job",
    family: "data",
    technology: ["python", "sql"],
    source: "devoteam",
    days: "0",
    page: "4",
  });
  const next = filtersUrl(f, { city: "rabat", page: 1 });
  assert.match(next, /family=data/);
  assert.match(next, /technology=python%2Csql/);
  assert.match(next, /source=devoteam/);
  assert.doesNotMatch(next, /page=/);
});
test("only meaningful known query input compacts the introduction; route defaults do not", () => {
  for (const params of [
    {},
    { utm_source: "newsletter" },
    { q: " " },
    { technology: [] },
  ])
    assert.equal(hasCatalogContext(params), false);
  for (const params of [
    { q: "java" },
    { days: "0" },
    { page: "2" },
    { technology: ["python", "sql"] },
    { kind: "competition" },
    { tech: "1" },
  ])
    assert.equal(hasCatalogContext(params), true);
  assert.equal(
    activeCategory(parseFilters({ tech: "1", workplace: "remote" })),
    "tech",
  );
  assert.equal(
    activeCategory(parseFilters({ kind: "competition" })),
    "competitions",
  );
  assert.equal(
    activeCategory(parseFilters({ contract: "Stage" })),
    "internships",
  );
  assert.equal(activeCategory(parseFilters({ workplace: "remote" })), "remote");
});
test("repeated checkbox values round-trip through parsing, pagination and detail return", () => {
  const parsed = parseFilters({
    tech: "1",
    family: ["software", "data"],
    technology: ["python", "sql"],
    language: ["fr", "en"],
    seniority: ["junior", "senior"],
    pfe: "1",
    days: "0",
  });
  const href = filtersUrl(parsed, { page: 3 });
  assert.equal(catalogReturnUrl(href), href);
  const restored = parseFilters(
    Object.fromEntries(new URL(href, "https://virtus.invalid").searchParams),
  );
  assert.deepEqual(restored, { ...parsed, page: 3 });
});
