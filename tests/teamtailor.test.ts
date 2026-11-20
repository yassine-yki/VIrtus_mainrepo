import test from "node:test";
import assert from "node:assert/strict";
import { collectTeamtailor } from "../src/collectors/teamtailor";
import { sources } from "../src/lib/sources";
const source = sources.find((s) => s.id === "inwi")!;
const link = "https://jobs.inwi.ma/jobs/123-software-engineer";
const sitemap = `<urlset><url><loc>${link}</loc></url></urlset>`;
const rss = `<rss xmlns:tt="urn:tt"><channel><item><title>Software Engineer Python</title><link>${link}</link><pubDate>Mon, 16 Nov 2026 12:05:36 +0000</pubDate><description>Python required.</description><remoteStatus>hybrid</remoteStatus><tt:locations><tt:location><tt:city>Rabat</tt:city><tt:country>Morocco</tt:country></tt:location></tt:locations></item></channel></rss>`;
test("Teamtailor verifies complete stable independent URL sets and preserves metadata only", async () => {
  const jobs = await collectTeamtailor(source, async (u) =>
    u.endsWith("rss") ? rss : sitemap,
  );
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].description, "");
  assert.deepEqual(jobs[0].tech?.requiredTechnologies, ["python"]);
  assert.equal(jobs[0].workplace, "hybrid");
  assert.deepEqual(jobs[0].city_keys, ["rabat"]);
  assert.equal(jobs[0].published_at, "2026-11-16T12:05:36.000Z");
});
test("Teamtailor rejects incomplete, repeated, foreign-link and changed feeds; never infers country from employer", async () => {
  await assert.rejects(
    collectTeamtailor(source, async (u) =>
      u.endsWith("rss") ? "<rss><channel/></rss>" : sitemap,
    ),
    /incomplete/,
  );
  await assert.rejects(
    collectTeamtailor(source, async (u) =>
      u.endsWith("rss")
        ? rss.replace(link, "https://evil.example/jobs/123-title")
        : sitemap,
    ),
    /Unexpected/,
  );
  let calls = 0;
  await assert.rejects(
    collectTeamtailor(source, async (u) => {
      calls++;
      return u.endsWith("rss") ? rss : calls === 3 ? "<urlset/>" : sitemap;
    }),
    /changed/,
  );
  const foreign = await collectTeamtailor(source, async (u) =>
    u.endsWith("rss") ? rss.replace("Morocco", "France") : sitemap,
  );
  assert.equal(foreign.length, 0);
  const missing = await collectTeamtailor(source, async (u) =>
    u.endsWith("rss")
      ? rss.replace(
          "<tt:city>Rabat</tt:city><tt:country>Morocco</tt:country>",
          "",
        )
      : sitemap,
  );
  assert.equal(missing.length, 0);
});
