import { readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL to the Supabase direct/session-pooler connection string",
  );
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(189677401)");
  await client.query(
    "create table if not exists public.virtus_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  await client.query(
    "alter table public.virtus_migrations enable row level security; revoke all on public.virtus_migrations from public,anon,authenticated",
  );
  for (const name of [
    "202610250001_catalog",
    "202610250002_private_review",
    "202610250003_competitions",
  ]) {
    const { rowCount } = await client.query(
      "select 1 from public.virtus_migrations where name=$1",
      [name],
    );
    if (!rowCount) {
      await client.query(
        await readFile(
          new URL(`../supabase/migrations/${name}.sql`, import.meta.url),
          "utf8",
        ),
      );
      await client.query(
        "insert into public.virtus_migrations(name) values($1) on conflict do nothing",
        [name],
      );
    }
  }
  await client.query("commit");
  console.log("Catalog schema up to date");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
