import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { sources } from "../src/lib/sources";
import { collectHimalayas } from "../src/collectors/himalayas";
test("95% source commits are atomic, never reconcile unseen jobs, expire without collection, and stay out of exports", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const source = sources.find((s) => s.id === "himalayas")!;
    const now = Date.now();
    const jobs = (
      await collectHimalayas(
        source,
        async () => ({
          totalCount: 2,
          limit: 20,
          offset: 0,
          jobs: [1, 2].map((i) => ({
            guid: "https://himalayas.app/companies/example/jobs/software-" + i,
            applicationLink:
              "https://himalayas.app/companies/example/jobs/software-" +
              i +
              "?utm_source=api",
            title: "Software Engineer",
            companyName: "Example",
            locationRestrictions: ["Morocco"],
            pubDate: Math.floor(now / 1000),
            expiryDate: Math.floor((now + 86400000) / 1000),
          })),
        }),
        async () => {},
        now,
      )
    ).jobs;
    const commit = async (js: unknown[], reported = 100, observed = 95) =>
      db.query(
        "select public.commit_source_sync($1::jsonb,$2::jsonb,now()+interval '1 microsecond')",
        [
          JSON.stringify({
            ...source,
            collectionEvidence: { reported, observed },
          }),
          JSON.stringify(js),
        ],
      );
    await commit(jobs);
    await db.query(
      "update public.listings set last_seen_at=now()-interval '10 days' where id=$1",
      [jobs[1].id],
    );
    await db.query(
      "update public.sources set last_success_at=now()-interval '1 minute' where id='himalayas'",
    );
    await commit([jobs[0]]);
    const retained = await db.query<{ active: boolean; missing_count: number }>(
      "select active,missing_count from public.listings where id=$1",
      [jobs[1].id],
    );
    assert.equal(retained.rows[0].active, true);
    assert.equal(retained.rows[0].missing_count, 0);
    await assert.rejects(commit(jobs, 100, 94), /95 percent/);
    await db.exec("set role anon");
    const visible = await db.query<{ total: number }>(
      "select count(*)::int as total from public.catalog_tech_jobs where source_id='himalayas'",
    );
    assert.equal(visible.rows[0].total, 2);
    const exported = await db.query<{
      value: { total: number; sources: { id: string }[] };
    }>("select public.search_catalog_export(p_source=>'himalayas') as value");
    assert.equal(exported.rows[0].value.total, 0);
    assert.ok(
      exported.rows[0].value.sources.every((s) => s.id !== "himalayas"),
    );
    await assert.rejects(commit(jobs), /permission denied/);
    await db.exec("reset role");
    await db.query(
      "update public.listings set expires_at=now()-interval '1 second' where id=$1",
      [jobs[1].id],
    );
    await db.exec(
      "insert into public.sync_runs(source_id,status,count,started_at,error) values('himalayas','failed',0,now(),'Synthetic failed collection');set role anon",
    );
    assert.equal(
      (
        await db.query<{ total: number }>(
          "select count(*)::int as total from public.catalog_tech_jobs where source_id='himalayas'",
        )
      ).rows[0].total,
      1,
    );
    await db.exec(
      "reset role;update public.sources set enabled=false,publication_status='blocked' where id='himalayas'",
    );
    await assert.rejects(commit(jobs), /disabled or blocked/);
  } finally {
    await db.close();
  }
});
