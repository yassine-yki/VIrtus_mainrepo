# Operations and handoff

## Created infrastructure

- Supabase project: `virtus-jobs`, ref `bynzprawodlkldfslzxg`, region `eu-west-1`.
- Vercel project: `virtus-jobs`, ID `prj_xtFGAt47gRKFACnurPIZIZWyAJuE`.
- Git repository: `https://github.com/yassine-yki/VIrtus_mainrepo`.

These identifiers are configuration metadata, not credentials. Existing projects were not modified. Project creation on Supabase was quoted at $0/month on the connected free organization; future usage and billing remain subject to the provider's account limits.

## Refresh diagnosis

1. Check the latest `sync_runs` rows per source and `sources.last_success_at`.
2. On HTTP failures, preserve existing records and retry within the collector's bounded budget. Never convert a failure to an empty successful run.
3. On a suspicious count drop, inspect the original source and parser before permitting reconciliation.
4. On an outdated sync rejection, check for overlapping runners. The workflow prevents overlap and the database rejects older runs.
5. Check the 72-hour freshness cutoff before assuming an empty result means the jobs disappeared.

`sources.last_success_at` records source-level freshness. Listing-level `last_seen_at` records the most recent complete sync in which that listing appeared. Search date filters use `published_at`, never first-seen as a substitute.

## Database security

- Public table reads use RLS and only expose active, recent listings from approved sources.
- The catalog view uses `security_invoker=true`; public query RPCs use caller permissions.
- Collector reconciliation is restricted to `service_role` and uses a per-source transaction lock.
- `sync_runs`, migration history and preview token hashes deliberately have RLS with **no public policies**. They are server/operator-only, not forgotten public-read tables.
- The two preview RPCs are intentionally `SECURITY DEFINER` and callable with a separate unguessable token checked in their bodies. Supabase advisors flag these entry points because they are anonymous-callable; this is a documented read-only capability design, not blanket public access. Tests verify missing/wrong tokens are rejected and pending sources stay hidden through normal reads. Revoke these functions and remove the preview token when owner review is no longer needed.
- No employer account, candidate profile, résumé or application is collected.

## Initial review import

`scripts/export-review-batch.ts` exports bounded JSON batches from the ignored local snapshot for an operator-assisted initial import through the connected SQL tool. It never reads `.env` or exports credentials. The imported source rows remain pending. This is a one-time bootstrap path, not the recurring collector; subsequent imports should use `pnpm collect` and the atomic reconciliation RPC.

## Deployment readiness

- Website build and tests can run without secrets.
- A real-data hosted review requires the private-preview token configured through an authorized path. Keep it out of Git and the Production environment.
- The recurring workflow is prepared but requires collector credentials and explicit activation. A configured YAML file alone is not proof that scheduled refreshes are running.
- Public launch also requires source publication approval. Pending-source data must not be exposed just to populate a demo.
- Fonts currently load from Google Fonts, with system fallbacks. Self-host them if deployment privacy requirements require eliminating that request.

## Recovery

Restore a known application commit or redeploy its Vercel build. The initial schema is additive; do not drop tables as a rollback. Stop collection with the repository variable or `COLLECTION_ENABLED=false`, retain the last valid data, and inspect the cause. Changing the preview token requires updating both its database hash and the Preview environment value, then redeploying; old access cookies become invalid.

## Expanded collection and credentials

- `collection` is a GitHub environment restricted to `main` branches (no tags). Its variable `SUPABASE_URL` identifies this project; its secret `SUPABASE_SECRET_KEY` is used only by source jobs. Do not store this key in Vercel or `.env.local` for deployment.
- Run the `Refresh job catalog` workflow manually on `main` with the schedule disabled. After all source jobs succeed, enable repository variable `COLLECTION_ENABLED=true`. Confirm the first actual `schedule` event separately; a successful manual run is not scheduled-run evidence.
- The six-hour UTC schedule is `17 */6 * * *`. Two source jobs run concurrently at most; other sources keep running if one fails. The workflow prevents overlapping catalog runs. GitHub may delay scheduled events.
- Each source calls `register_source` before network access and checks its result. Registration inserts new rows as pending and never overwrites approval or operator enablement. `commit_source_sync` checks the database state again with a row lock; disabling or blocking a source during fetching prevents its commit.
- Suspend one source with `update public.sources set enabled=false where id='source-id'`. Set publication status to `blocked` to remove its listings from public and private reads. Resume only after investigation. The registry is a technical default, not a permission override.
- For key rotation, replace the GitHub environment secret with a new Supabase secret key, complete a manual collection, then revoke the old key in Supabase. Do not rotate unrelated project keys.
- Enable GitHub Actions failure notifications through the owner's account settings if desired. Inspect `sync_runs` and `sources.last_success_at` for freshness; no new email/Slack notification service is configured.

## Competition handling

The `competition_open` SQL predicate enforces deadline visibility for table RLS and the public/private catalog view. It compares calendar dates in `Africa/Casablanca`, not a fixed UTC offset. Dates stay visible until the end of that local day; the source's official notice determines any earlier hour. The TypeScript snapshot uses the same timezone rule.

Wadifa's per-minute limit is enforced inside the HTTP client (61 seconds between attempts); a Retry-After longer than two minutes fails the run. A 2,000-item response is treated as potentially truncated. Missing employer/deadline rows are quarantined with item ID warnings. Other malformed values fail collection so a broken parser cannot reconcile a partial feed.

Public smoke: `pnpm exec tsx scripts/smoke-public.ts https://virtus-jobs.vercel.app`. It verifies anonymous Supabase search, competition metadata, official notices, attribution without nofollow, filters and source visibility. Set `SMOKE_PENDING_JOB_ID` to a known pending group key to additionally assert a public 404. Its current employer-zero assertion is a launch check for this first licensed public source; update it deliberately when approving further sources.

Keep `PUBLIC_INDEXING_ENABLED=false` until public production smoke passes. Then set it true in Production and redeploy. Preview's `CATALOG_AUDIENCE=internal` always disables indexing, even if the indexing flag is inherited accidentally. Vercel Standard Protection should protect preview/deployment URLs while the production domain remains publicly accessible.

Migration 003 adds optional metadata and replaces the search RPC signature with a final defaulted `p_kind` argument, preserving callers that omit it. The older application can read migrated records, but use the new application for attribution-compliant public competition display. Roll back the app only after blocking the competition source if the old build lacks attribution. Prefer retaining schema/data rather than destructive reverse migrations.
