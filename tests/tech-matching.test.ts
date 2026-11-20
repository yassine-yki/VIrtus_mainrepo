import test from "node:test";
import assert from "node:assert/strict";
import { classifyTech } from "../src/lib/tech";
import { emptyProfile, validateProfile } from "../src/lib/profile";
import { matchJob, rankMatches } from "../src/lib/matching";
import { normalizeListing } from "../src/lib/normalize";
import { sources } from "../src/lib/sources";
import {
  catalogReturnUrl,
  filtersUrl,
  parseFilters,
  searchSnapshot,
} from "../src/lib/search";
import type { Job, CatalogSnapshot } from "../src/lib/types";
const now = new Date().toISOString();
const job = (i = 1): Job => ({
  ...normalizeListing(sources[2], {
    externalId: String(i),
    title: "Développeur Python senior",
    location: "Rabat",
    country: "MA",
    url: `https://example.com/${i}`,
    description:
      "Python and SQL required. English required. AWS preferred. Minimum 5 years required.",
    publishedAt: now,
  })!,
  sources: [
    {
      id: sources[2].id,
      name: sources[2].name,
      url: `https://example.com/${i}`,
    },
  ],
});
test("classification excludes non-tech employers' roles and separates optional skills, languages and PFE", () => {
  assert.deepEqual(
    classifyTech("Comptable", "We develop software using Java").families,
    [],
  );
  assert.deepEqual(
    classifyTech("Business développeur (secteur électrique)").families,
    [],
  );
  assert.deepEqual(classifyTech("Business Analyst Credit").families, []);
  assert.deepEqual(
    classifyTech(
      "Software engineer",
      "Node.js and .NET required. Français et anglais requis.",
    ).requiredTechnologies,
    ["nodejs", "dotnet"],
  );
  assert.deepEqual(classifyTech("Ingénieur mécanique").families, []);
  const t = classifyTech(
    "Stage PFE Développeur Java",
    "Java required. Python is optional. Français requis. English is preferred.",
  );
  assert.equal(t.pfe, true);
  assert.equal(t.seniority, "internship");
  assert.deepEqual(t.requiredTechnologies, ["java"]);
  assert.deepEqual(t.requiredLanguages, ["fr"]);
  assert.deepEqual(
    classifyTech(
      "Software Engineer",
      "Annonce en anglais sans exigence linguistique.",
    ).requiredLanguages,
    [],
  );
  assert.deepEqual(classifyTech("Développeur", "", "competition").families, []);
});
test("all matches remain pageable; reasons and gaps follow the same evidence; unknown is not a negative qualification", () => {
  const profile = emptyProfile();
  profile.skills = ["Python"];
  profile.preferences.families.values = ["software"];
  profile.years = 2;
  const jobs = Array.from({ length: 37 }, (_, i) => job(i));
  assert.equal(rankMatches(profile, jobs).total, 37);
  assert.equal(rankMatches(profile, jobs, 30, 3).matches.length, 12);
  assert.equal(rankMatches(profile, jobs, 30, 4).matches.length, 1);
  const match = matchJob(profile, jobs[0])!;
  assert.ok(match.reasons.some((r) => r.includes("python")));
  assert.ok(match.gaps.some((r) => r.includes("sql")));
  assert.ok(match.conflicts.some((r) => r.includes("5 ans")));
  assert.ok(!match.gaps.some((r) => r.includes("aws")));
  const unknown = { ...job(), workplace: "unknown" as const };
  profile.preferences.workplace = { values: ["remote"], mandatory: false };
  assert.ok(
    matchJob(profile, unknown)?.unknowns.some((r) => r.includes("Mode")),
  );
  profile.preferences.workplace.mandatory = true;
  assert.equal(matchJob(profile, unknown), null);
  assert.equal(matchJob(profile, { ...unknown, workplace: "onsite" }), null);
  assert.equal(matchJob(profile, { ...unknown, kind: "competition" }), null);
  profile.preferences.workplace.mandatory = false;
  assert.equal(
    rankMatches(profile, [{ ...unknown, last_seen_at: "2020-01-01" }]).total,
    0,
  );
  assert.equal(
    rankMatches(profile, [{ ...unknown, published_at: "2020-01-01" }], 30)
      .total,
    0,
  );
  assert.equal(
    rankMatches(profile, [{ ...unknown, published_at: "2020-01-01" }], 0).total,
    1,
  );
});
test("profile validation strips unknown personal fields, rejects malformed dates, and does not add overlapping experience", () => {
  const profile = emptyProfile();
  profile.history = [
    {
      role: "Developer",
      organization: "Example",
      start: "2020-01",
      end: "2024-01",
    },
    {
      role: "Consultant",
      organization: "Another",
      start: "2021-01",
      end: "2023-01",
    },
  ];
  assert.equal(validateProfile(profile).years, null);
  assert.equal(
    "nationality" in validateProfile({ ...profile, nationality: "ignored" }),
    false,
  );
  assert.throws(() =>
    validateProfile({
      ...profile,
      history: [{ ...profile.history[0], end: "2010-01" }],
    }),
  );
  assert.throws(() => validateProfile({ ...profile, years: -1 }));
});
test("tech filters preserve multi-select, all dates and safe return links", () => {
  const filters = parseFilters({
    tech: "1",
    family: ["software", "data"],
    technology: "python",
    days: "0",
    page: "3",
  });
  assert.equal(filters.family, "software,data");
  assert.match(filtersUrl(filters), /^\/tech\?/);
  assert.equal(catalogReturnUrl(filtersUrl(filters)), filtersUrl(filters));
  assert.equal(catalogReturnUrl("//evil.example/tech"), "/#offres");
  const listing = job();
  const snapshot: CatalogSnapshot = {
    version: 1,
    collected_at: now,
    listings: [
      listing,
      { ...job(2), title: "Comptable", tech: classifyTech("Comptable") },
    ],
    sources: [{ ...sources[2], publicationStatus: "approved" }],
    runs: [],
  };
  assert.equal(searchSnapshot(snapshot, filters, false).total, 1);
  assert.equal(
    searchSnapshot(snapshot, { ...filters, technology: "java" }, false).total,
    0,
  );
});
test("international remote requires explicit country eligibility and never borrows a foreign city", () => {
  const input = {
    externalId: "remote",
    title: "Software engineer",
    location: "London / worldwide",
    country: "GB",
    workplace: "remote" as const,
    url: "https://example.com/remote",
  };
  assert.equal(normalizeListing(sources[2], input), null);
  const eligible = normalizeListing(sources[2], {
    ...input,
    eligibleCountries: ["MA"],
  })!;
  assert.deepEqual(eligible.city_keys, []);
  assert.deepEqual(eligible.locations, ["Maroc"]);
  assert.equal(eligible.tech?.eligibility, "remote-morocco");
});
