# Virtus — emploi au Maroc

French-first public job-link aggregator using Next.js, TypeScript and Supabase, deployed on Vercel. Visitors see job facts and original application links. No candidate account, résumé upload or private website version.

## Implemented

- Keyword, city, contract, workplace, source, date and opportunity-type filters; sorting and pagination across the indexed catalog.
- SmartRecruiters, Greenhouse, Lever and the licensed Wadifa Info competition API.
- Seven original employer feeds plus nine additional qualifying feeds from a [20-employer audit](docs/EMPLOYER-AUDIT.md); eleven zero-result candidates stay disabled.
- Public competition deadlines, position counts, original notices and visible Wadifa attribution.
- Metadata-only public responses: title, company, location, contract and links. Imported full ad descriptions stay operator-only and are excluded from public search.
- One public catalog. The old review key, access form and private RPC permissions are retired; /access redirects home.
- Atomic source synchronization, failure preservation, suspicious-drop protection, source suspension and conservative expiry.
- Six-hour collection matrix with at most two concurrent source jobs.

Other Moroccan-board scrapers and LinkedIn are not connected. See [sources](docs/SOURCES.md), [operations](docs/OPERATIONS.md), and [release evidence](docs/LAUNCH.md).

## Develop

Use Node.js 24 and the pnpm version pinned in package.json:

```sh
pnpm install --frozen-lockfile
# Configure .env.local from .env.example; never commit it.
pnpm collect --snapshot
pnpm dev
```

Local snapshots are ignored by Git, clearly labelled as development data, and never used in production. The local server also displays metadata only.

## Supabase

Migrations in supabase/migrations are additive and tracked by a local ledger. Configure DATABASE_URL only for the operator migration command, then run `pnpm db:migrate`; alternatively use the connected migration tool.

The website needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. It must not receive a Supabase secret key. RLS restricts public rows to enabled, published, active, recent sources and unexpired competition deadlines. Column permissions prevent direct public reads of full descriptions; security-invoker views return an empty description field for API compatibility.

Publication status is an operator visibility switch, not a claim of third-party permission. Current employer metadata was made public at the owner's explicit request on 2026-10-25. New source registration defaults to pending; collectors cannot approve, unblock or re-enable sources. Blocked sources are excluded everywhere.

## Vercel

Use the Next.js preset, Node.js 24, repository root, `pnpm install --frozen-lockfile` and `pnpm build`. Production tracks main.

Configure the website's two publishable read values for Production and Preview. Set PUBLIC_INDEXING_ENABLED=true only in Production after public smoke passes, and false in Preview. Preview deployments use the same public catalog; Vercel's platform deployment protection remains enabled for nonproduction/deployment URLs. There is no app-level private catalog or review-key login.

The former CATALOG_AUDIENCE and VIRTUS_REVIEW_TOKEN values are unused; the hosted preview token was cleared. No custom domain is needed.

## Collection

The GitHub collection environment permits main branches only. Set its variable SUPABASE_URL and secret SUPABASE_SECRET_KEY directly in GitHub. Never paste the key in chat, commit it or place it in Vercel.

Manual dispatch of Refresh job catalog works before schedule activation. After a complete successful manual run, set repository variable COLLECTION_ENABLED=true. The regular schedule is 00:17, 06:17, 12:17 and 18:17 UTC; GitHub may delay scheduled events. The matrix generator has no database credentials; source jobs receive them only after main-only environment checks.

```sh
pnpm collect --only=wadifa
pnpm collect --only=inetum
pnpm collect --snapshot
```

Failed/partial collections never reconcile. A suspicious drop below half of a prior source count (when previously at least ten) fails safely. Missing jobs close after two complete successful misses and at least 24 hours since last seen. Reads exclude records not seen for 72 hours.

Competitions additionally disappear after their deadline day ends in Africa/Casablanca, independently of collection success. The official notice determines any earlier closing hour. Missing employer/deadline records are quarantined with explicit warnings; malformed dates fail the run. Wadifa uses one feed read per run, retries no sooner than 61 seconds and rejects the undocumented 2,000-item truncation boundary.

## API and checks

GET /api/jobs accepts q, city, contract, workplace, source, days, page, sort and optional kind=job|competition. Omitting kind searches both. Responses include kind, deadline (YYYY-MM-DD), positions, official_notice_url and attribution_url when available. The description field remains present but empty.

```sh
pnpm typecheck
pnpm test
pnpm build
git diff --check
pnpm exec tsx --env-file=.env.local scripts/smoke-db.ts
pnpm exec tsx scripts/smoke-public.ts https://virtus-jobs.vercel.app
```

Tests exercise actual PostgreSQL migrations/RLS, public metadata permissions, retired review endpoints, accent handling, full-catalog search, deadline timezone boundaries, source suspension, parser failures, attribution and expiry. Fixtures are synthetic and kept out of the real catalog.
