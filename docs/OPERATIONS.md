# Virtus operations

## Infrastructure

- Supabase virtus-jobs: bynzprawodlkldfslzxg, eu-west-1.
- Vercel virtus-jobs: prj_xtFGAt47gRKFACnurPIZIZWyAJuE.
- Repository: yassine-yki/VIrtus_mainrepo; production branch main.
- Public domain: https://virtus-jobs.vercel.app.

## Public data model

The owner chose one public metadata/link catalog on 2026-10-25. Active employer feeds and Wadifa competitions are publicly listed. Full imported advertisement text stays operator-only; public table column permissions reject description reads and the security-invoker catalog view returns an empty description. Public keyword search therefore uses titles and companies, not private advertisement bodies.

sources.publication_status is a visibility control. Approved means enabled for publication by the owner, not a separately verified licence. Employer source notes record this distinction. Wadifa's CC BY 4.0 metadata licence and mandatory visible per-item attribution are recorded separately. The collector never overwrites publication approval, blocking, enablement or evidence notes.

The former app-level review gate was removed. /access redirects home; migration 004 revokes anon/authenticated execution on old review RPCs. Historical tables/functions remain as inert migration history, with RLS and no public policies. No website uses their capability. The old Vercel preview token is cleared.

## Scheduling and failures

GitHub's collection environment is restricted to main branches, excluding tags. Its variable SUPABASE_URL identifies this project; its secret SUPABASE_SECRET_KEY is used only by source jobs. The site does not have this write credential.

The Refresh job catalog workflow uses one job per enabled source, at most two concurrently, and prevents overlapping workflow runs. The matrix generator receives no credential. Every source has a 25-minute timeout. A source failure does not cancel others.

Manual dispatch is allowed before activating repository variable COLLECTION_ENABLED=true. After manual success, verify the first actual schedule event separately. The cron is 17 _/6 _ \* \* UTC. Scheduled runs may be delayed.

Check sync_runs rows and sources.last_success_at for each source. Failed collections preserve prior listings; incomplete pagination, changed totals, duplicate source IDs and suspicious drops fail before reconciliation. A source drop below half its prior active count, when previously at least ten, requires investigation. Two successful misses and 24 hours since last seen are needed to close a missing job. Reads exclude observations older than 72 hours.

Registration happens before fetching so first-run failures can be logged. It inserts pending sources without overriding existing operator state. The commit function checks source state again with a row lock. A source disabled or blocked while fetching cannot commit.

Suspend one source with `update public.sources set enabled=false where id='source-id'`. Set publication_status='blocked' to immediately hide it. Resume only after investigation. To stop scheduled collection globally, set repository variable COLLECTION_ENABLED=false.

## Credentials and recovery

Replace the GitHub environment secret with a new Supabase secret key, complete a manual collection, then revoke the old key in Supabase. Do not rotate unrelated keys. Never put a write key in Vercel or source control.

main requires the verify check; force pushes and deletion are disabled. Environment branch policy permits main only. Owner/admin bypass remains available for repository recovery.

Restore a known application commit through a reviewed branch or redeploy a compatible Vercel build. Keep schema/data intact. Migration 004 intentionally restricts older clients that expected full-description table reads or private preview RPC access. Do not undo those permissions to restore the retired private website.

## Competitions

Deadline visibility is evaluated in table RLS and the catalog view using the current calendar date in Africa/Casablanca. There is no fixed UTC offset assumption. The official notice determines an earlier precise hour. The local snapshot uses the same timezone rule.

Wadifa's HTTP client waits at least 61 seconds between attempts. A Retry-After over two minutes fails the run. Exactly 2,000 feed items is considered potentially truncated. Missing employer/deadline rows are quarantined with item-ID warnings; impossible dates and other malformed metadata fail collection.

Every displayed competition links visibly to its Wadifa source item without nofollow and to the official Emploi-public notice. Metadata adaptation and the CC BY 4.0 licence are identified on details. No PDF extraction, salary feed or applicant data is collected.

## Verification and indexing

`pnpm exec tsx scripts/smoke-public.ts https://virtus-jobs.vercel.app` verifies public API filtering, both opportunity types, official application links, visible attribution, audience-correct source counts, empty description fields and /access redirecting home. `scripts/smoke-db.ts` additionally checks direct full-description reads and old review endpoints are denied.

Production indexing is enabled after public smoke passes. Preview keeps PUBLIC_INDEXING_ENABLED=false; VERCEL_ENV=preview also prevents indexing. Vercel Standard Protection protects deployment/preview URLs while the production domain is public.

The local browser is disabled in this session's Work settings. HTTP/SSR checks verify server behaviour; a fresh interactive visual/keyboard walkthrough remains unverified. Fonts use Google Fonts with system fallbacks.

Supabase security advisors previously warned about anonymous review SECURITY DEFINER RPCs; migration 004 revokes those public entrypoints. RLS-with-no-policy notices on operator-only tables are intentional deny-by-default.
