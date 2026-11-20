import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { emptyProfile } from "../src/lib/profile";
import { sources } from "../src/lib/sources";
import { normalizeListing } from "../src/lib/normalize";
test("new migrations preserve collector atomicity, public visibility, profile isolation and atomic budget caps", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;
    create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
    for (const file of (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const a = "11111111-1111-4111-8111-111111111111",
      b = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}'`);
    await db.query(
      "insert into candidate_profiles(user_id,profile) values($1,$2::jsonb)",
      [a, JSON.stringify(emptyProfile())],
    );
    await assert.rejects(
      db.query(
        "insert into candidate_profiles(user_id,profile) values($1,$2::jsonb)",
        [b, JSON.stringify(emptyProfile())],
      ),
      /row-level security/,
    );
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    assert.equal(
      (await db.query("select * from candidate_profiles")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("delete from candidate_profiles returning user_id")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("select * from virtus_private.cv_usage"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.reserve_cv_extraction('test',1)"),
      /not configured/,
    );
    await db.exec(
      "reset role; update virtus_private.cv_budget_config set enabled=true,reservation_usd=1,config_version='test'",
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}'`);
    await db.query(
      "update candidate_profiles set revision=999,profile=$1::jsonb",
      [JSON.stringify(emptyProfile())],
    );
    assert.equal(
      (
        await db.query<{ revision: number }>(
          "select revision::int from candidate_profiles",
        )
      ).rows[0].revision,
      2,
    );
    const reservations = await Promise.allSettled(
      Array.from({ length: 7 }, () =>
        db.query("select public.reserve_cv_extraction('test',1)"),
      ),
    );
    assert.equal(
      reservations.filter((r) => r.status === "fulfilled").length,
      5,
    );
    await db.exec(`set request.jwt.claim.sub='${b}'`);
    await assert.rejects(
      db.query("select public.reserve_cv_extraction('wrong',1)"),
      /not configured/,
    );
    await assert.rejects(
      db.query("select public.reserve_cv_extraction('test',2)"),
      /not configured/,
    );
    for (let i = 0; i < 5; i++)
      await db.query("select public.reserve_cv_extraction('test',1)");
    await db.exec(
      "reset role; update virtus_private.cv_usage set created_at=now()-interval '1 day'",
    );
    // Ensure historical reservations remain in the current month even on the first day.
    await db.exec(
      "update virtus_private.cv_usage set created_at=greatest(created_at,date_trunc('month',now()))",
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${b}'`);
    await assert.rejects(
      db.query("select public.reserve_cv_extraction('test',1)"),
      /budget exhausted|Daily extraction/,
    );
    await db.exec(
      `set request.jwt.claim.sub='${a}'; delete from candidate_profiles`,
    );
    assert.equal(
      (await db.query("select * from candidate_profiles")).rows.length,
      0,
    );
    await db.exec("reset role");
    const source = sources[2],
      job = normalizeListing(source, {
        externalId: "one",
        title: "Software engineer Python",
        location: "Rabat",
        url: "https://example.com/one",
        description: "Python required.",
      })!;
    await db.query("select commit_source_sync($1::jsonb,$2::jsonb,now())", [
      JSON.stringify(source),
      JSON.stringify([job]),
    ]);
    await db.query(
      "update sources set publication_status='approved' where id=$1",
      [source.id],
    );
    await db.exec("set role anon");
    const visible = await db.query<{
      data: { jobs: { tech: { families: string[] }; description: string }[] };
    }>("select get_tech_catalog() as data");
    assert.equal(visible.rows[0].data.jobs.length, 1);
    assert.deepEqual(visible.rows[0].data.jobs[0].tech.families, ["software"]);
    assert.equal(visible.rows[0].data.jobs[0].description, "");
    await assert.rejects(
      db.query("select profile from candidate_profiles"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select description from listings"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select commit_source_sync_without_tech('{}','[]',now())"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select reserve_cv_extraction('test',1)"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "update sources set publication_status='blocked' where id=$1",
      [source.id],
    );
    await db.exec("set role anon");
    assert.equal(
      (
        await db.query<{ data: { jobs: unknown[] } }>(
          "select get_tech_catalog() as data",
        )
      ).rows[0].data.jobs.length,
      0,
    );
  } finally {
    await db.close();
  }
});
