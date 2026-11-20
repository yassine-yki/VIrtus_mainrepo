# Virtus Tech implementation status

Updated 2026-11-20. Branch: `codex/virtus-tech-matching`.

This is work in progress, not a frontend production release report. The additive migration and manual feed imports have been applied; the frontend changes have not yet been committed, pushed or deployed.

## Implemented locally

- Shared tech classification, `/tech` filters, catalog RPC, deterministic matching with all qualifying results paginated by 12.
- Private candidate profile routes and editor, email/password authentication, ownership RLS, profile deletion and revision tracking. The user replaced email-link authentication with a no-confirmation-email flow. Registration is gated by `CANDIDATE_PASSWORD_AUTH_READY`. With explicit action-time approval, Supabase Confirm email was disabled and verified after dashboard reload on 2026-11-18. Email/password remains enabled; anonymous sign-ins remain disabled. End-to-end account creation still needs verification before enabling the readiness flag.
- Transient bounded PDF/DOCX parsing and configurable Hugging Face extraction, strict output validation, daily limits and atomic monthly budget reservations. Live extraction remains disabled.
- Teamtailor RSS/sitemap completeness checks for inwi and Leyton Morocco. Both registry entries are enabled; database suspension controls remain authoritative.
- Twenty-employer audit in `TECH-EXPANSION-AUDIT-2026-11-17.json`. Only two additional complete feeds passed validation. Deferred feeds have unknown counts, not zero vacancies.

## Verification on 2026-11-18

- `pnpm test`: 59 passed, zero failed after the password flow and parser changes. Includes PostgreSQL migrations/RLS/budget tests, synthetic PDF extraction, DOCX handling, response-size limits and matching pagination.
- `pnpm build`: succeeded, including TypeScript and all routes. The initial build revealed incompatible ESM resolution for PDF.js; package-path resolution was corrected.
- `git diff --check`: passed.
- PDF.js native crashes were isolated by moving parsing to a bounded child process. The full suite and production build passed after this change.
- Upgraded Next.js to 16.4.5 and fflate to 0.8.3; production dependency audit reported zero vulnerabilities.
- The 100-job manually labelled title fixture measured 100% inclusion precision, 100% precision across 63 emitted tags, and 78.125% recall. This is a title-only benchmark prepared during implementation, not independent human validation of full advertisements. Description requirements have separate synthetic tests.
- Local browser verified multi-family tech filters and password fields. Registration is hidden while its readiness flag is false. No confirmation email was sent.
- On 2026-11-20 two disposable accounts signed up without confirmation emails, received immediate sessions and signed in again with passwords. Authenticated API tests verified profile save/reload/edit/delete, revision changes, cross-user read/write denial, private caching and preservation after disabled extraction. Both accounts signed out and were removed. No candidate CV was used.
- Mandatory preferences require explicit supporting job metadata; unknown values remain eligible only for flexible preferences. Reasons and unknown labels do not claim missing qualifications.

## Production database progress

- Supabase connection restored and project `bynzprawodlkldfslzxg` verified. Applied the additive `virtus_tech_profiles` migration.
- Backfilled 989 active employer records using title-only evidence without changing collection timestamps. Initial backfill exposed 303 tech jobs, including 99 within 30 days at check time.
- Manually imported 60 distinct inwi jobs and 15 Leyton Morocco jobs through atomic reconciliation. These include 13 tech jobs, two within 30 days. These operator imports are not GitHub scheduled-run evidence.
- Candidate features and live extraction remain disabled in production.
- Supabase advisor flags the authenticated security-definer quota RPC. This intentional callable function checks `auth.uid()`, locks private configuration and enforces fixed limits; clients cannot read the ledger or set/refund costs. Private tables without policies intentionally deny direct access.

## Remaining release gates

1. Obtain independent human review of classification and candidate pilot results; do not expand the title benchmark claim to full-description accuracy.
2. Review profile UI initial-load behavior, session switching, private caching, authenticated endpoint behavior, parser timeouts and provider retry-after handling; run browser verification.
3. Verify GitHub collection using the enabled Teamtailor feeds and corresponding Supabase timestamps. Existing employer-site connectors classify already-fetched descriptions transiently without retaining full advertisements.
4. Review tech filter facets, French labels, source freshness data and job-detail navigation. Hide competition choices in the tech-only filter form.
5. Verify the deployed public catalog and six-hour collection with maximum concurrency two. Do not substitute operator imports for scheduled-run evidence.
6. Finish operating instructions, format/review changes, run CI and production/browser verification before merging and deploying. Keep candidate features flagged off until their prerequisites are ready.
7. Immediate password sessions have been verified. Set `CANDIDATE_PASSWORD_AUTH_READY=true` together with the candidate pilot rollout. This is a readiness switch, not an authorization boundary. No SMTP, OTP or email recovery is included in this release. Email addresses are unverified identifiers and must never grant organization membership or extra permissions.
8. Configure the chosen Hugging Face model, endpoint, verified pricing and processing/retention terms. Pilot with ten consenting candidates before wider launch.

## Operation and rollback

- Collection stays at `17 */6 * * *`, maximum two source jobs concurrently. Collector write credentials remain in GitHub's protected `collection` environment.
- Diagnose freshness using workflow results, `sync_runs`, source `last_success_at`, original publication dates and selected date windows. Never force reconciliation after an incomplete feed to hide a failure.
- Suspend individual sources using existing database status controls. Registry defaults must not overwrite suspension or publication decisions.
- Disable candidate pages with `CANDIDATE_PROFILES_ENABLED=false`; independently disable extraction with `CV_EXTRACTION_ENABLED=false` and private budget configuration. Public browsing remains available.
- Roll back Vercel to the last verified deployment if needed; leave additive database objects and profile data intact.
- Rotate collector keys in Supabase and GitHub's collection environment, verify a manual refresh, then revoke the old key. Rotate Hugging Face credentials only in the server environment. Never log CV text, credentials or raw provider responses.
- Only confirmed structured profiles are saved. Owners may edit, replace or delete them; failed replacement uploads preserve the previous profile. Private APIs use no-store and noindex headers.

Source publication remains scoped to job facts and original application links under the user's existing authorization. Do not reintroduce private employer feeds or disclose raw CVs, full advertisements or credentials.
