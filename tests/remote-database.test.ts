import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { collectWikimedia } from "../src/collectors/remote-employers";
import { sources } from "../src/lib/sources";
test("remote evidence survives atomic storage and public tech reads while registration preserves suspension", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;",
    );
    for (const f of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const seed = await readFile("scripts/register-remote-sources.sql", "utf8");
    await db.exec(seed);
    const source = sources.find((s) => s.id === "wikimedia")!;
    const jobs = await collectWikimedia(source, async () => ({
      meta: { total: 1 },
      jobs: [
        {
          id: 1,
          title: "Senior Software Engineer",
          location: { name: "Remote" },
          absolute_url: "https://job-boards.greenhouse.io/wikimedia/jobs/1",
          first_published: "2026-11-17T12:00:00Z",
          content: "<p>Countries: Brazil, Morocco, Netherlands.</p>",
        },
      ],
    }));
    await db.query(
      "select public.commit_source_sync($1::jsonb,$2::jsonb,now())",
      [JSON.stringify(source), JSON.stringify(jobs)],
    );
    await db.exec("set role anon");
    const result = await db.query<{
      value: { jobs: { tech: { remoteEvidence: { country: string } } }[] };
    }>("select public.get_tech_catalog() as value");
    assert.equal(
      result.rows[0].value.jobs[0].tech.remoteEvidence.country,
      "MA",
    );
    await assert.rejects(
      db.query("select description from public.listings"),
      /permission denied/,
    );
    await db.exec(
      "reset role; update public.sources set enabled=false,publication_status='blocked' where id='wikimedia'",
    );
    await db.exec(seed);
    const disabled = await db.query<{
      enabled: boolean;
      publication_status: string;
    }>(
      "select enabled,publication_status from public.sources where id='wikimedia'",
    );
    assert.equal(disabled.rows[0].enabled, false);
    assert.equal(disabled.rows[0].publication_status, "blocked");
    await db.exec("set role anon");
    assert.equal(
      (
        await db.query<{ value: { jobs: unknown[] } }>(
          "select public.get_tech_catalog() as value",
        )
      ).rows[0].value.jobs.length,
      0,
    );
  } finally {
    await db.close();
  }
});
