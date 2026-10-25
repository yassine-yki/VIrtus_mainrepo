# Virtus — emploi au Maroc

A French-first, mobile-friendly job aggregator built with Next.js, TypeScript and Supabase PostgreSQL, prepared for Vercel. Visitors search the entire indexed catalog and apply on the original employer website. No candidate account, résumé upload or automated application is required.

## What is implemented

- Keyword search, city/contract/workplace/source/date filters, relevance/date sorting, shareable URLs and pagination.
- Job details, original application links, explicit publication/discovery dates and a sources/methodology page.
- SmartRecruiters, Greenhouse and Lever collectors; seven initial employer feeds plus nine qualifying feeds from an audit of 20 additional employers.
- Licensed Wadifa Info public-competition metadata, visible attribution, official notices, position counts and Casablanca-date deadline expiry.
- Morocco-only normalization, accent-insensitive search, exact-link duplicate grouping and multiple cities.
- Atomic per-source database updates, failure preservation, suspicious-drop detection and conservative expiry.
- Public RLS policies and a separate key-protected owner preview. Pending sources cannot appear through the public API.
- CI checks and an opt-in six-hour collection matrix, isolated per source with at most two concurrent jobs.

Wadifa Info uses its documented JSON API. Other Moroccan job-board scrapers and LinkedIn are **not** active integrations. See [source status](docs/SOURCES.md), the [20-employer audit](docs/EMPLOYER-AUDIT.md), and [launch checklist](docs/LAUNCH.md).

## Local development

Use Node.js 24 and the pnpm version pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
# Copy .env.example to .env.local and configure the values you need.
pnpm collect --snapshot
pnpm dev
```

Open the Local URL printed by Next.js. Snapshot collection needs no database credentials. It reads real public employer feeds, writes `data/catalog.json` (ignored by Git), and clearly labels the local interface as a working preview. Local snapshots are never served in production. The 72-hour freshness cutoff applies to snapshots too; recollect when necessary.

## Supabase

1. Create a dedicated Supabase project and configure `DATABASE_URL` in `.env.local` using its direct or session-pooler connection.
2. Run `pnpm db:migrate`, or apply the tracked SQL migrations using the Supabase migration tools. The local ledger prevents applying them twice.
3. Configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for website reads.
4. Configure `SUPABASE_SECRET_KEY` **only in the collector environment**, then run `pnpm collect`.

The website does not need a database secret key. `SUPABASE_SECRET_KEY` bypasses RLS and must never be placed in a browser bundle or committed. No secret is included in this repository.

### Public versus private review

All initial sources default to `pending`. After establishing a source's applicable reuse agreement, an administrator can set `sources.publication_status = 'approved'` and record the evidence in `permission_note`. Collectors cannot approve sources or reset an existing approval. `blocked` sources never appear, including in owner review queries.

With `CATALOG_AUDIENCE=public`, only approved sources are visible. An empty public catalog while approval is pending is intentional.

For a hosted **private preview**, set `CATALOG_AUDIENCE=internal` and a random 64-character hex `VIRTUS_REVIEW_TOKEN` in the **Preview** environment only. Store its MD5 hash in the single row of `virtus_private.review_access`. The token is a random 256-bit capability, not a user-chosen password; the stored hash is for matching, not password stretching. Visit `/access` and enter the token. The app uses an HttpOnly/Secure/SameSite cookie, and private database RPCs validate the token independently. The capability grants reads only; it cannot collect, modify listings, or approve sources. Keep Vercel Deployment Protection enabled as an additional layer.

Generate the value locally with Node's `crypto.randomBytes(32).toString('hex')`, without putting it in shell history or source. The token and its hash must be configured through an authorized secret-management path. Neither is committed. Do not enable a production internal preview without separately authorizing that configuration.

## Vercel

Import this repository, select the Next.js preset, Node.js 24, and the repository root. Use `pnpm install --frozen-lockfile` and `pnpm build`. Builds do not require Supabase credentials; configured runtime reads do.

| Environment     | Variables                                                                   |
| --------------- | --------------------------------------------------------------------------- |
| Production      | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `CATALOG_AUDIENCE=public`       |
| Private preview | Same read configuration, `CATALOG_AUDIENCE=internal`, `VIRTUS_REVIEW_TOKEN` |
| Collector only  | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`                                       |

If using `vercel env pull`, link to the intended project first and pull to a new ignored file: do not overwrite an existing `.env.local` containing custom local values. Vercel does not return all stored secrets through env pulls.

Set `PUBLIC_INDEXING_ENABLED=true` in Production only after the anonymous public smoke check passes. Internal previews and the access page always stay `noindex`. No custom domain is configured.

## Scheduled collection

The `Refresh job catalog` workflow runs from `main` every six hours when repository variable `COLLECTION_ENABLED=true`. Manual dispatch is available before schedule activation. Configure environment variable `SUPABASE_URL` and environment secret `SUPABASE_SECRET_KEY` inside the GitHub `collection` environment, with deployment policy permitting the `main` branch only. The matrix generator receives no database credentials. Source jobs receive the environment's values, run one source each, and never upload data or credentials as artifacts. Protect/review the branch before giving a workflow database credentials. Workflow schedules are best effort, not exact-time guarantees.

```sh
pnpm collect                         # All enabled, non-blocked employer feeds
pnpm collect --only=alten,sqli        # A source subset
pnpm collect --snapshot              # Local review only
```

Failed fetches and partial pagination never reconcile or expire a source. A drop below half of a source's prior active count (when it had at least ten jobs) requires investigation. A missing job closes only after two successful complete misses and at least 24 hours since last seen. Public reads exclude records not seen for 72 hours. See [operations](docs/OPERATIONS.md).

Competitions additionally disappear after their deadline day ends in `Africa/Casablanca`, even if later collection fails. Missing employers/deadlines are quarantined with an explicit collection warning; impossible dates and malformed records fail the run. No location is inferred from an employer's name. Wadifa collection uses one feed request per run, retries no sooner than 61 seconds, and rejects the undocumented 2,000-item truncation boundary.

The search API accepts optional `kind=job|competition`; omitting it searches both. Listing responses add `kind`, `deadline` (YYYY-MM-DD), `positions`, `official_notice_url` and `attribution_url`. Existing URLs and filters remain compatible.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

The tests exercise actual PostgreSQL migrations with PGlite, public RLS, read-only preview capabilities, search beyond the first result page, French accents, source filtering, unsafe HTML, duplicate evidence and expiry/failure behavior. Test fixtures are synthetic and never mixed into the job catalog.

## Structure

```text
src/app/               Website, job detail and search API routes
src/components/        Shared server-rendered interface
src/lib/               Normalization, search, catalog access, source registry
src/collectors/        Reusable provider connectors and bounded HTTP client
scripts/               Collection and migration commands
supabase/migrations/   Versioned database schema and access rules
tests/                 Connector, search and real PostgreSQL tests
docs/                  Source status and operational handoff
```
