import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { normalizeListing } from "../src/lib/normalize";
import { sources } from "../src/lib/sources";
test("Postgres migrations, full catalog search, RLS and safe reconciliation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610250001_catalog.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610250002_private_review.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const reviewToken = "a".repeat(64);
    await db.query(
      "insert into virtus_private.review_access(token_hash) values(md5($1))",
      [reviewToken],
    );
    const source = sources[2];
    const makeJob = (i: number) =>
      normalizeListing(source, {
        externalId: String(i),
        title: i === 30 ? "Comptable exceptionnel" : "Développeur Java",
        location: "Rabat",
        url: `https://example.com/jobs/${i}`,
        contract: "Permanent",
      })!;
    const jobs = Array.from({ length: 35 }, (_, i) => makeJob(i));
    const sync = async (
      payload: unknown,
      startedAt = new Date(Date.now() - 1000).toISOString(),
    ) =>
      db.query(
        "select public.commit_source_sync($1::jsonb,$2::jsonb,$3::timestamptz)",
        [JSON.stringify(source), JSON.stringify(payload), startedAt],
      );
    await sync(jobs);
    await db.exec("set role anon");
    const hidden = await db.query<{ count: number }>(
      "select count(*)::integer as count from public.catalog_jobs",
    );
    assert.equal(
      hidden.rows[0].count,
      0,
      "pending sources hidden through view",
    );
    await assert.rejects(
      db.query("select * from virtus_private.review_access"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.search_catalog_review(p_token => 'wrong')"),
      /Review access denied/,
    );
    const review = await db.query<{ data: { total: number } }>(
      "select public.search_catalog_review(p_token => $1) as data",
      [reviewToken],
    );
    assert.equal(
      review.rows[0].data.total,
      35,
      "private capability reads pending sources",
    );
    await assert.rejects(
      sync(jobs),
      /permission denied/,
      "public cannot invoke collector",
    );
    await db.exec("reset role");
    await db.query(
      "update public.sources set publication_status='approved' where id=$1",
      [source.id],
    );
    await db.exec("set role anon");
    const result = await db.query<{
      data: { total: number; jobs: { title: string }[] };
    }>("select public.search_catalog(p_query => 'exceptionnel') as data");
    assert.equal(result.rows[0].data.total, 1);
    assert.match(result.rows[0].data.jobs[0].title, /Comptable/);
    const accents = await db.query<{ data: { total: number } }>(
      "select public.search_catalog(p_query => 'developpeur') as data",
    );
    assert.equal(
      accents.rows[0].data.total,
      34,
      "SQL search ignores French accents",
    );
    await assert.rejects(
      db.query("update public.sources set publication_status='approved'"),
      /permission denied/,
    );
    await db.exec("reset role");
    await assert.rejects(sync([]), /Suspicious source drop|Outdated sync/);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer as n from public.listings where active",
        )
      ).rows[0].n,
      35,
    );
    await db.exec(
      "update public.sources set last_success_at=now()-interval '2 hours'; update public.listings set last_seen_at=now()-interval '30 hours';",
    );
    await sync(jobs.slice(0, 34));
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer as n from public.listings where active",
        )
      ).rows[0].n,
      35,
      "one missing sync does not close a job",
    );
    await db.exec(
      "update public.sources set last_success_at=now()-interval '2 hours'",
    );
    await sync(jobs.slice(0, 34));
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer as n from public.listings where active",
        )
      ).rows[0].n,
      34,
      "two successful misses after 24h close it",
    );
    await db.exec(
      "update public.sources set last_success_at=now()-interval '2 hours'",
    );
    await assert.rejects(
      sync([{ ...jobs[0], source_id: "other" }]),
      /Cross-source/,
    );
    const state = await db.query<{ publication_status: string }>(
      "select publication_status from public.sources where id=$1",
      [source.id],
    );
    assert.equal(
      state.rows[0].publication_status,
      "approved",
      "sync never overwrites publication permission",
    );
  } finally {
    await db.close();
  }
});
