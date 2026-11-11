import test from "node:test";
import assert from "node:assert/strict";
import {
  collectCapgemini,
  collectCgi,
  collectOrange,
  collectCegedim,
  orangePublication,
} from "../src/collectors/employer-sites";
import type { Source } from "../src/lib/types";

const source = (id: string): Source => ({
  id,
  name: id,
  company: id,
  provider: "html",
  identifier: `${id}-ma`,
  website: "https://example.com",
  enabled: true,
  publicationStatus: "pending",
  permissionNote: "test",
});
const capItem = (id = "123") => ({
  id,
  title: "Data &amp; AI Engineer",
  country_code: "en-ma",
  status: "1",
  location: "Casablanca",
  contract_type: "Permanent",
  apply_job_url: `https://careers.capgemini.com/job/Casablanca-Data/${id}/?utm_source=test`,
  updated_at: "2026-11-11",
  description: "Full advertisement",
});
const capHtml =
  '<div itemscope itemtype="http://schema.org/JobPosting"><span itemprop="title">Data &amp; AI Engineer</span><meta itemprop="datePosted" content="2025-01-01"></div>';
const ld = (data: object) =>
  `<script type="application/ld+json">${JSON.stringify({ "@type": "JobPosting", ...data })}</script>`;
const orangeItem = (id = "ICM-123") => ({
  jobId: id,
  jobSeqNo: `OYVOCZGB${id.replace("-", "")}EXTERNALFRFR`,
  title: "Développeur &amp; QA",
  country: "MOROCCO",
  city: "Rabat",
  visibilityType: "External",
  contractType: "CDI",
  hiringType: "Temps complet",
  postedDate: "2026-11-11",
});
const orangeHtml = (jobs: unknown[], total = jobs.length) =>
  `<script>phApp.ddo = ${JSON.stringify({ eagerLoadRefineSearch: { status: 200, hits: jobs.length, totalHits: total, data: { jobs } } })};</script>`;
const orangeDetail = (
  id = "ICM-123",
  description = "<p>Date de publication : Aug 07, 2025, 12:00AM</p>Full advertisement",
) =>
  ld({
    identifier: { value: id },
    title: "Développeur & QA",
    hiringOrganization: { name: "Orange Business" },
    datePosted: "2026-11-11",
    description,
  });
const cgiRow = (id = "J1126-123", country = "Maroc", title = "AI &amp; Data") =>
  `<tr><td><a href="xweb.asp?clid=21001&Page=JobDetails&Jobid=${id}&lang=2">${id}</a></td><td>${title}</td><td>IT</td><td>Rabat</td><td>${country}</td></tr>`;
const cgiHtml = (rows: string, total = 1) =>
  `<header>Résultats de recherche (${total})</header><table class="table-result-search"><tbody>${rows}</tbody></table>`;
const cgiDetail = () =>
  ld({
    title: "AI & Data",
    hiringOrganization: { name: "CGI" },
    datePosted: "2026-10-01",
    employmentType: "FULL_TIME",
    description: "Full advertisement",
    jobLocation: {
      address: { addressCountry: "MA ", addressLocality: "Rabat" },
    },
  });

test("Capgemini collects every page, uses original publication date and strips descriptions", async () => {
  const pages: number[] = [];
  const jobs = await collectCapgemini(
    source("capgemini"),
    async (u) => {
      const page = Number(new URL(u).searchParams.get("page"));
      pages.push(page);
      return {
        count: 101,
        total: 101,
        data:
          page === 1
            ? Array.from({ length: 100 }, (_, i) => capItem(String(i)))
            : [capItem("100")],
      };
    },
    async (u) => {
      assert.equal(new URL(u).search, "");
      return capHtml;
    },
  );
  assert.deepEqual(pages, [1, 2]);
  assert.equal(jobs.length, 101);
  assert.equal(jobs[0].published_at, "2025-01-01T00:00:00.000Z");
  assert.equal(jobs[0].title, "Data & AI Engineer");
  assert.equal(jobs[0].description, "");
  assert.equal(jobs[0].contract, "CDI");
});
test("Capgemini refuses partial, duplicate, changed and unsafe feeds", async () => {
  for (const payload of [
    { count: 2, total: 2, data: [capItem()] },
    { count: 2, total: 2, data: [capItem(), capItem()] },
    { count: 1, total: 2, data: [capItem()] },
    {
      count: 1,
      total: 1,
      data: [{ ...capItem(), apply_job_url: "https://evil.example/job/123" }],
    },
    { count: 1, total: 1, timed_out: true, data: [capItem()] },
  ])
    await assert.rejects(
      collectCapgemini(
        source("capgemini"),
        async () => payload,
        async () => capHtml,
      ),
    );
  let page = 0;
  await assert.rejects(
    collectCapgemini(
      source("capgemini"),
      async () =>
        ++page === 1
          ? {
              count: 101,
              total: 101,
              data: Array.from({ length: 100 }, (_, i) => capItem(String(i))),
            }
          : { count: 102, total: 102, data: [capItem("100")] },
      async () => capHtml,
    ),
    /changed/,
  );
  await assert.rejects(
    collectCapgemini(
      source("capgemini"),
      async () => ({ count: 1, total: 1, data: [capItem()] }),
      async () => "maintenance",
    ),
    /no longer/,
  );
});
test("Capgemini rejects foreign country and keeps absent dates unknown", async () => {
  const jobs = await collectCapgemini(
    source("capgemini"),
    async () => ({
      count: 2,
      total: 2,
      data: [{ ...capItem("1"), country_code: "en-fr" }, capItem("2")],
    }),
    async () =>
      capHtml.replace('<meta itemprop="datePosted" content="2025-01-01">', ""),
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].published_at, null);
});
test("Orange uses explicit original publication date rather than refreshed search metadata", async () => {
  const jobs = await collectOrange(source("orange"), async (u) =>
    u.includes("search-results")
      ? orangeHtml([
          orangeItem(),
          { ...orangeItem("ICM-456"), country: "FRANCE" },
        ])
      : orangeDetail(),
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].published_at, "2025-08-07T00:00:00.000Z");
  assert.equal(jobs[0].description, "");
  assert.equal(jobs[0].company, "Orange Business");
  assert.equal(jobs[0].contract, "CDI");
  assert.equal(orangePublication("No publication date"), undefined);
  for (const value of [
    "Date de publication : unknown",
    "Date de publication : Feb 30, 2025",
    "Date de publication : Bad 02, 2025",
  ])
    assert.throws(() => orangePublication(value));
});
test("Orange checks complete pagination and refuses mismatched details", async () => {
  const offsets: number[] = [];
  const jobs = await collectOrange(source("orange"), async (u) => {
    if (u.includes("search-results")) {
      const n = Number(new URL(u).searchParams.get("from"));
      offsets.push(n);
      return orangeHtml(
        n === 0
          ? Array.from({ length: 10 }, (_, i) => orangeItem(`ICM-${i}`))
          : [orangeItem("ICM-10")],
        11,
      );
    }
    const id = u.match(/OYVOCZGBICM(\d+)/)![1];
    return orangeDetail(`ICM-${id}`);
  });
  assert.equal(jobs.length, 11);
  assert.deepEqual(offsets, [0, 10]);
  await assert.rejects(
    collectOrange(source("orange"), async (u) =>
      u.includes("search-results")
        ? orangeHtml([orangeItem()], 2)
        : orangeDetail(),
    ),
    /Incomplete/,
  );
  await assert.rejects(
    collectOrange(source("orange"), async (u) =>
      u.includes("search-results")
        ? orangeHtml([orangeItem()])
        : orangeDetail("ICM-wrong"),
    ),
    /identity/,
  );
  await assert.rejects(
    collectOrange(source("orange"), async () => "maintenance"),
    /Missing/,
  );
});
test("CGI counts all search rows but excludes explicit foreign jobs and preserves dates", async () => {
  let requests = 0;
  const jobs = await collectCgi(source("cgi"), async (u) => {
    requests++;
    return u.includes("joblisting")
      ? cgiHtml(cgiRow() + cgiRow("J1126-999", "Allemagne"), 2)
      : cgiDetail();
  });
  assert.equal(requests, 2);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, "AI & Data");
  assert.equal(jobs[0].published_at, "2026-10-01T00:00:00.000Z");
  assert.equal(jobs[0].description, "");
  assert.equal(jobs[0].contract, "Non précisé");
});
test("CGI fails closed on truncation, duplicate IDs, foreign details and unsafe URLs", async () => {
  for (const page of [
    cgiHtml(cgiRow(), 2),
    cgiHtml(cgiRow() + cgiRow(), 2),
    cgiHtml(cgiRow().replace("xweb.asp?", "https://evil.example/?")),
  ])
    await assert.rejects(
      collectCgi(source("cgi"), async (u) =>
        u.includes("joblisting") ? page : cgiDetail(),
      ),
    );
  await assert.rejects(
    collectCgi(source("cgi"), async (u) =>
      u.includes("joblisting")
        ? cgiHtml(cgiRow())
        : cgiDetail().replace("MA ", "FR"),
    ),
    /location/,
  );
});

const cegItem = () => ({
  id: "123-456",
  job_ad_id: 123,
  title: "Vue Developer",
  location: "Rabat",
  contract: "CDI",
  is_external: false,
  is_aggregated: false,
  career_domain: "careers.cegedim.com",
});
const cegDetail = () => ({
  ...cegItem(),
  job_ad_status: 1,
  url: "123-vue-developer-rabat",
  republished_at: "2026-11-11",
  jsonld: {
    identifier: { value: "123-456" },
    title: "Vue Developer",
    datePosted: "2025-01-02",
    description: "Full advertisement",
    jobLocation: {
      address: { addressCountry: "Maroc", addressLocality: "Rabat" },
    },
  },
});
test("Cegedim verifies country and original dates without retaining descriptions", async () => {
  const jobs = await collectCegedim(
    source("cegedim"),
    async () => cegDetail(),
    async (url, body) => {
      assert.equal(new URL(url).searchParams.get("locale"), "fr_FR");
      assert.deepEqual(body, { filters: {} });
      return { count: 1, items: [cegItem()] };
    },
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].published_at, "2025-01-02T00:00:00.000Z");
  assert.equal(jobs[0].description, "");
  assert.equal(
    jobs[0].url,
    "https://careers.cegedim.com/fr/annonce/123-vue-developer-rabat",
  );
  const foreign = cegDetail();
  foreign.jsonld.jobLocation.address.addressCountry = "France";
  assert.equal(
    (
      await collectCegedim(
        source("cegedim"),
        async () => foreign,
        async () => ({ count: 1, items: [cegItem()] }),
      )
    ).length,
    0,
  );
});
test("Cegedim rejects partial feeds, duplicates and identity changes", async () => {
  for (const payload of [
    { count: 2, items: [cegItem()] },
    { count: 2, items: [cegItem(), cegItem()] },
    { count: 1, items: [{ ...cegItem(), is_external: true }] },
  ])
    await assert.rejects(
      collectCegedim(
        source("cegedim"),
        async () => cegDetail(),
        async () => payload,
      ),
    );
  await assert.rejects(
    collectCegedim(
      source("cegedim"),
      async () => ({ ...cegDetail(), url: "https://evil.example" }),
      async () => ({ count: 1, items: [cegItem()] }),
    ),
    /slug/,
  );
});
