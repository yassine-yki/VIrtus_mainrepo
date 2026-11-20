# Virtus — emploi au Maroc

French-first public job-link aggregator using Next.js, TypeScript and Supabase, deployed on Vercel. Visitors browse job facts and original application links without an account. The `/tech` catalog adds specialized filters. Private candidate profiles and CV matching are implemented behind pilot feature flags; the public catalog has no review-key login.

## Implemented

- Keyword, city, contract, workplace, source, date and opportunity-type filters; sorting and pagination across the indexed catalog.
- SmartRecruiters, Greenhouse, Lever, Workable, Ashby, Teamtailor, audited employer sites and the licensed Wadifa Info competition API.
- Employer audits document supported, empty and unverified sources. The [tech expansion audit](docs/TECH-EXPANSION-AUDIT-2026-11-17.json) adds complete inwi and Leyton Morocco feeds; unvalidated candidates remain disabled.
- Public competition deadlines, position counts, original notices and visible Wadifa attribution.
- Metadata-only public responses: title, company, location, contract and links. Imported full ad descriptions stay operator-only and are excluded from public search.
- One public catalog. The old review key, access form and private RPC permissions are retired; /access redirects home.
- Atomic source synchronization, failure preservation, suspicious-drop protection, source suspension and conservative expiry.
- Six-hour collection matrix with at most two concurrent source jobs.
- Role-level tech classification and filters for family, technologies, seniority, required languages and PFE. Last 30 days is the default; all dates remain available.
- Flagged candidate profiles with email/password authentication, confirmed structured data, ownership RLS and deterministic matching across all eligible tech jobs, paginated by 12. No automatic applications or per-job LLM requests.

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

GET /api/jobs accepts q, city, contract, workplace, source, days, page, sort and optional kind=job|competition. Omitting kind searches both. Add `tech=1`, `family`, `technology`, `seniority`, `language` and `pfe=1` for tech filtering; multi-select fields accept repeated parameters or comma-separated values. Responses include optional tech metadata, kind, deadline (YYYY-MM-DD), positions, official_notice_url and attribution_url. The description field remains present but empty.

## Candidate pilot configuration

Keep `CANDIDATE_PROFILES_ENABLED=false` and `CV_EXTRACTION_ENABLED=false` until the relevant pilot gates are met. Set `CANDIDATE_PASSWORD_AUTH_READY=true` only after verifying Supabase email/password signup with Confirm email off. This flow deliberately does not verify email ownership; email addresses must not authorize organization access. No SMTP, magic links or email recovery are implemented.

The server parses text PDF/DOCX inputs transiently (4 MB, 30,000 extracted characters, 30 PDF pages). The build materializes parser dependencies in ignored `.cv-runtime/` as real files for Vercel packaging. Only confirmed structured profiles/preferences are saved; original files and complete extracted text are not stored. Manual profiles and matching work without Hugging Face.

Before enabling extraction, select the Llama model and explicit HTTPS Hugging Face endpoint, review the actual processing/retention terms, and configure `HF_TOKEN`, token prices, `HF_PRICING_VERSION`, `HF_PRIVACY_URL` and `HF_PRIVACY_REVIEWED=true`. Credentials are server-only. Use an endpoint with bounded token billing; fixed endpoint hosting charges are not covered by the token reservation ledger and require a separate provider billing cap.

Using an operator database connection, set `virtus_private.cv_budget_config.config_version` to `llama-profile-v1:<HF_PRICING_VERSION>:<HF_MODEL>` and `reservation_usd` to at least `ceil(2 * (124000 * input_price + 4096 * output_price)) / 1000000`. Prices are USD per million tokens; the reservation covers the maximum input/output for both attempts. Keep `monthly_cap=10`. Enable the database configuration and `CV_EXTRACTION_ENABLED` only after verifying the prices and limits together. A mismatch, five attempts per user per UTC day or an exhausted monthly budget fails closed; reservations are not refunded. Disabling either switch stops extraction while preserving manual profiles.

Private APIs validate Supabase users and use ownership RLS with publishable credentials, no-store caching and noindex headers. Candidate pages remain non-indexed. Complete the pilot with ten consenting candidates before wider release. See [implementation and rollout evidence](docs/TECH-IMPLEMENTATION-STATUS.md) for remaining gates, source suspension, refresh diagnosis and rollback.

## Verification

```sh
pnpm typecheck
pnpm test
pnpm build
git diff --check
pnpm exec tsx --env-file=.env.local scripts/smoke-db.ts
pnpm exec tsx scripts/smoke-public.ts https://virtus-jobs.vercel.app
```

Tests exercise actual PostgreSQL migrations/RLS, public metadata permissions, retired review endpoints, accent handling, full-catalog search, deadline timezone boundaries, source suspension, parser failures, attribution and expiry. Fixtures are synthetic and kept out of the real catalog.
