import assert from "node:assert/strict";
import { load } from "cheerio";
const base = process.argv[2] ?? "http://127.0.0.1:3002";
const api = await fetch(`${base}/api/jobs?kind=competition`);
assert.equal(api.status, 200);
const data = await api.json();
assert.equal(data.mode, "supabase");
assert.ok(data.total > 0);
assert.ok(
  data.jobs.every(
    (job: { kind: string; attribution_url: string }) =>
      job.kind === "competition" &&
      new URL(job.attribution_url).hostname === "www.wadifa-info.com",
  ),
);
assert.ok(
  data.sources.every(
    (source: { publication_status: string }) =>
      source.publication_status === "approved",
  ),
);
assert.ok(
  data.jobs.every((job: { description: string }) => job.description === ""),
);
const employer = await (await fetch(`${base}/api/jobs?kind=job`)).json();
assert.ok(employer.total > 0);
assert.ok(
  employer.jobs.every((job: { description: string }) => job.description === ""),
);
const html = await (await fetch(`${base}/?kind=competition`)).text(),
  $ = load(html);
const attribution = $("a.attribution");
assert.ok(attribution.length > 0);
attribution.each((_, el) => {
  assert.equal($(el).text().trim(), "Source : Wadifa Info");
  assert.ok(!($(el).attr("rel") ?? "").includes("nofollow"));
});
assert.equal($("select[name=kind]").val(), "competition");
const id = data.jobs[0].group_key;
const detailResponse = await fetch(`${base}/offres/${id}`);
assert.equal(detailResponse.status, 200);
const detail = load(await detailResponse.text());
assert.ok(detail(".competition-badge").text().includes("Concours public"));
assert.ok(detail(".competition-meta").text().includes("Date limite"));
assert.equal(
  detail(".apply-panel a.search-button").attr("href"),
  data.jobs[0].official_notice_url,
);
assert.equal(
  detail("a.attribution").attr("href"),
  data.jobs[0].attribution_url,
);
const sources = load(await (await fetch(`${base}/sources`)).text());
assert.equal(sources(".source-cards article").length, data.sources.length);
const employerPage = await fetch(
  `${base}/offres/${employer.jobs[0].group_key}`,
);
assert.equal(employerPage.status, 200);
const employerDetail = load(await employerPage.text());
assert.ok(
  employerDetail(".description").text().includes("description complète"),
);
assert.equal(
  employerDetail(".apply-panel a.search-button").attr("href"),
  employer.jobs[0].url,
);
const access = await fetch(`${base}/access`, { redirect: "manual" });
assert.ok([307, 308].includes(access.status));
assert.equal(new URL(access.headers.get("location")!, base).pathname, "/");
console.log(
  JSON.stringify({
    publicApi: api.status,
    competitions: data.total,
    employerJobs: employer.total,
    attribution: "verified",
    details: "official notice and deadline verified",
    sources: "all active published feeds; metadata only",
    robots: $("meta[name=robots]").attr("content"),
  }),
);
