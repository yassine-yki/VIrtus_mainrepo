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
