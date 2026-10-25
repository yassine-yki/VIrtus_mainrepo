import test from "node:test";
import assert from "node:assert/strict";
import {
  collectGreenhouse,
  collectLever,
  collectSmartRecruiters,
} from "../src/collectors/connectors";
import { sources } from "../src/lib/sources";
import {
  canonicalUrl,
  citiesFor,
  contractFor,
  isMoroccoLocation,
  normalizeListing,
  plainText,
} from "../src/lib/normalize";
const source = sources[2];
test("Morocco filtering excludes remote jobs without Morocco eligibility", () => {
  assert.equal(isMoroccoLocation("Remote - Europe"), false);
  assert.equal(isMoroccoLocation("Remote (Morocco)"), true);
  assert.equal(isMoroccoLocation("Rabat", "FR"), false);
  assert.equal(isMoroccoLocation("الدار البيضاء"), true);
});
test("normalizes aliases and preserves multiple Moroccan cities", () => {
  assert.deepEqual(citiesFor("Casablanca ou Rabat selon votre mobilité").keys, [
    "casablanca",
    "rabat",
  ]);
  assert.deepEqual(citiesFor("Tangier").names, ["Tanger"]);
  assert.deepEqual(citiesFor("Fez").keys, ["fes"]);
});
test("a full-time schedule does not imply CDI", () => {
  assert.equal(contractFor("Full-time"), "Non précisé");
  assert.equal(contractFor("Permanent"), "CDI");
  assert.equal(contractFor("Internship"), "Stage");
});
test("canonicalizes tracking links while keeping meaningful query IDs", () => {
  assert.equal(
    canonicalUrl("https://jobs.lever.co/acme/123/apply?utm_source=x"),
    "https://jobs.lever.co/acme/123",
  );
  assert.equal(
    canonicalUrl("https://example.com/job?id=123&utm_campaign=x"),
    "https://example.com/job?id=123",
  );
  assert.throws(() => canonicalUrl("javascript:alert(1)"));
});
test("extracts only plain text from hostile source HTML", () => {
  const text = plainText(
    '<p>Bonjour</p><script>steal()</script><iframe src="x"></iframe><p>Maroc</p>',
  );
  assert.match(text, /Bonjour\nMaroc/);
  assert.doesNotMatch(text, /steal|iframe|<p>/);
});
test("decodes entity-encoded feed HTML without showing tags or script content", () => {
  const text = plainText(
    "&lt;div&gt;&lt;p&gt;Java &amp;amp; Spring&lt;/p&gt;&lt;script&gt;steal()&lt;/script&gt;&lt;p&gt;Casablanca&lt;/p&gt;&lt;/div&gt;",
  );
  assert.match(text, /Java & Spring\nCasablanca/);
  assert.doesNotMatch(text, /steal|<\/?(?:p|div|script)>|&lt;/);
  assert.equal(plainText(text), text);
});
test("similar titles at distinct employer URLs are not merged", () => {
  const a = normalizeListing(source, {
    externalId: "1",
    title: "Ingénieur",
    location: "Rabat",
    url: "https://example.com/jobs/1",
  })!;
  const b = normalizeListing(source, {
    externalId: "2",
    title: "Ingénieur",
    location: "Rabat",
    url: "https://example.com/jobs/2",
  })!;
  assert.notEqual(a.group_key, b.group_key);
});
test("Greenhouse filters locations and does not label updated_at as published_at", async () => {
  const jobs = await collectGreenhouse(sources[5], async () => ({
    jobs: [
      {
        id: 1,
        title: "Comptable",
        location: { name: "Casablanca" },
        absolute_url: "https://example.com/1",
        content: "&lt;p&gt;Mission&lt;/p&gt;",
        updated_at: "2026-10-21T00:00:00Z",
      },
      {
        id: 2,
        title: "Engineer",
        location: { name: "Remote - US" },
        absolute_url: "https://example.com/2",
        content: "",
      },
    ],
  }));
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].published_at, null);
  assert.equal(jobs[0].description, "Mission");
});
test("Lever rejects malformed responses instead of treating them as zero jobs", async () => {
  await assert.rejects(
    collectLever(sources[6], async () => ({ error: "blocked" })),
    /Invalid Lever/,
  );
});
test("SmartRecruiters rejects partial pagination and untrusted detail refs", async () => {
  const calls: string[] = [];
  await assert.rejects(
    collectSmartRecruiters(source, async (url) => {
      calls.push(url);
      if (url.includes("offset=0"))
        return {
          totalFound: 102,
          content: [
            {
              id: "a",
              name: "Test",
              location: { city: "Rabat", country: "ma" },
              ref: "http://127.0.0.1/private",
            },
          ],
        };
      if (url.endsWith("/a"))
        return {
          name: "Test",
          postingUrl: "https://example.com/a",
          location: { city: "Rabat", country: "ma" },
          jobAd: { sections: {} },
          typeOfEmployment: { label: "Permanent" },
        };
      return { totalFound: 102, content: [] };
    }),
    /Incomplete/,
  );
  assert.ok(
    calls.every((url) => url.startsWith("https://api.smartrecruiters.com/")),
  );
});
test("SmartRecruiters fails on a page error instead of returning a partial catalog", async () => {
  await assert.rejects(
    collectSmartRecruiters(source, async () => {
      throw new Error("HTTP 503");
    }),
    /503/,
  );
});
