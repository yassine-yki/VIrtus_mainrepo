import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { normalizeListing } from "../src/lib/normalize";
import { sources } from "../src/lib/sources";
import { parseFilters, searchSnapshot } from "../src/lib/search";
import type {
  Source,
  CatalogSnapshot,
  SearchResult,
  Job,
} from "../src/lib/types";

test("paginated SQL tech search matches snapshot filtering, facets, ranking and visibility", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const name of (await readdir("supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    await db.exec("begin");
    const now = Date.parse(
      (await db.query<{ n: string }>("select now()::text as n")).rows[0].n,
    );
    const a: Source = {
      ...sources[2],
      id: "perf-a",
      name: "Pérformance",
      company: "Pérformance",
      publicationStatus: "approved",
    };
    const b: Source = { ...a, id: "perf-b", name: "Beta", company: "Beta" };
    const jobs = Array.from({ length: 36 }, (_, i) => {
      const job = normalizeListing(a, {
        externalId: "job-" + i,
        title:
          (i % 3 === 0
            ? "Développeur Java Sénior"
            : i % 3 === 1
              ? "Data engineer Python"
              : "Ingénieur SRE Kubernetes") +
          " " +
          i,
        location: i % 2 ? "Rabat" : "Casablanca",
        url: "https://example.com/" + i,
        description: "Java and Python required. French required.",
        publishedAt:
          i % 5 === 0
            ? undefined
            : new Date(
                now - (i % 7 === 0 ? 60 : 1) * 86400000 - i * 1000,
              ).toISOString(),
      })!;
      job.tech = {
        ...job.tech!,
        families:
          i % 3 === 0 ? ["software"] : i % 3 === 1 ? ["data"] : ["cloud"],
        technologies: i % 2 ? ["python", "sql"] : ["java", "kubernetes"],
        seniority: i % 2 ? "senior" : "junior",
        requiredLanguages: i % 2 ? ["fr"] : ["en"],
        pfe: i === 3,
      };
      job.workplace = i % 2 ? "remote" : "onsite";
      job.contract = i === 3 ? "Stage" : "CDI";
      return job;
    });
    await db.query("select commit_source_sync($1::jsonb,$2::jsonb,now())", [
      JSON.stringify(a),
      JSON.stringify(jobs),
    ]);
    const duplicate = {
      ...jobs[1],
      id: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      source_id: b.id,
      external_id: "duplicate",
    };
    await db.query("select commit_source_sync($1::jsonb,$2::jsonb,now())", [
      JSON.stringify(b),
      JSON.stringify([duplicate]),
    ]);
    await db.query(
      "update sources set publication_status='approved' where id in ('perf-a','perf-b')",
    );
    await db.exec(
      "insert into sources(id,name,company,provider,website,enabled,publication_status,last_success_at) values('himalayas','Himalayas','Remote','himalayas','https://himalayas.app',true,'approved',now()) on conflict(id) do update set enabled=true,publication_status='approved',last_success_at=now()",
    );
    await db.exec(`insert into listings(id,group_key,source_id,external_id,company,title,description,locations,city_keys,country,workplace,contract,employment,salary,url,published_at,first_seen_at,last_seen_at,active,missing_count,kind,tech,expires_at,attribution_url)
   select 'ffffffffffffffffffffffffffffffff','ffffffffffffffffffffffffffffffff','himalayas','remote','Remote','Software Java engineer','',locations,city_keys,country,'remote',contract,employment,salary,url,null,first_seen_at,now(),true,0,kind,tech,now()+interval '1 day','https://himalayas.app' from listings where external_id='job-1' and source_id='perf-a'`);
    await db.query(
      "update listings set last_seen_at=now()-interval '4 days' where source_id='perf-a' and external_id='job-32'",
    );
    await db.query(
      "update listings set expires_at=now()-interval '1 hour' where source_id='perf-a' and external_id='job-33'",
    );
    await db.query(
      "update listings set active=false where source_id='perf-a' and external_id='job-34'",
    );
    await db.exec("set role anon");
    const original = (
      await db.query<{ d: { jobs: Job[]; sources: Source[] } }>(
        "select get_tech_catalog() as d",
      )
    ).rows[0].d;
    const snapshot: CatalogSnapshot = {
      version: 1,
      collected_at: original.jobs.map((j) => j.last_seen_at).sort()[0],
      sources: original.sources,
      listings: original.jobs,
      runs: [],
    };
    const cases = [
      {},
      { days: "30" },
      { q: "developpeur", days: "0" },
      { q: "SÉNIOR java", sort: "relevance" },
      { q: "engine", sort: "relevance" },
      { q: " PÉRFORMANCE   java ", sort: "relevance" },
      {
        family: "software,data",
        technology: "java,python",
        seniority: "senior,junior",
        language: "fr,en",
      },
      { city: "rabat", source: "perf-b" },
      { workplace: "remote", contract: "CDI" },
      { pfe: "1" },
      { page: "2" },
      { page: "999" },
      { q: "no-result" },
      { kind: "competition" },
      { source: "himalayas", days: "0" },
    ];
    const normalizeFacets = (r: SearchResult) => ({
      total: r.total,
      page: r.page,
      companies: r.companies,
      ids: r.jobs.map((j) => j.id),
      cities: [...r.cities].sort((a, b) => a.key.localeCompare(b.key)),
      sources: r.sources
        .map((s) => ({ id: s.id, count: s.count }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
    for (const exportOnly of [false, true])
      for (const params of cases) {
        const f = parseFilters({ tech: "1", days: "0", ...params });
        const expected = searchSnapshot(
          exportOnly
            ? {
                ...snapshot,
                sources: snapshot.sources.filter((s) => s.id !== "himalayas"),
                listings: snapshot.listings.filter(
                  (j) => j.source_id !== "himalayas",
                ),
              }
            : snapshot,
          f,
          true,
          now,
        );
        const actual = (
          await db.query<{ d: SearchResult }>(
            `select search_tech_catalog($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as d`,
            [
              f.q,
              f.city,
              f.contract,
              f.workplace,
              f.source,
              f.days,
              f.page,
              f.sort,
              f.kind ?? "",
              f.family ?? "",
              f.technology ?? "",
              f.seniority ?? "",
              f.language ?? "",
              f.pfe === "1",
              exportOnly,
            ],
          )
        ).rows[0].d;
        assert.deepEqual(
          normalizeFacets(actual),
          normalizeFacets(expected),
          JSON.stringify({ params, exportOnly }),
        );
        assert.ok(actual.jobs.length <= 12);
        assert.ok(actual.jobs.every((j) => j.description === ""));
      }
    const summary = (
      await db.query<{ d: SearchResult }>(
        "select get_catalog_source_summary() as d",
      )
    ).rows[0].d;
    const oldSummary = (
      await db.query<{ d: SearchResult }>("select search_catalog() as d")
    ).rows[0].d;
    assert.equal(summary.total, oldSummary.total);
    assert.deepEqual(summary.jobs, []);
    assert.deepEqual(
      summary.sources.map((s) => [s.id, s.count]).sort(),
      oldSummary.sources.map((s) => [s.id, s.count]).sort(),
    );
    await db.exec("savepoint denied_read");
    await assert.rejects(
      db.query("select description from listings"),
      /permission denied/,
    );
    await db.exec("rollback to savepoint denied_read");
    await db.exec(
      "reset role; update sources set enabled=false where id='perf-a'; update sources set publication_status='blocked' where id='perf-b'; set role anon",
    );
    const restricted = (
      await db.query<{ d: SearchResult }>(
        "select search_tech_catalog(p_export_only=>true) as d",
      )
    ).rows[0].d;
    assert.equal(restricted.total, 0);
    assert.ok(
      restricted.sources.every(
        (s) => !["perf-a", "perf-b", "himalayas"].includes(s.id),
      ),
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
