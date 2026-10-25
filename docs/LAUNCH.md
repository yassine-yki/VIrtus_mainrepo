# Expansion release evidence

## Delivered

- Audited 20 additional employers: nine qualifying feeds / 183 distinct jobs; eleven zero-result candidates disabled. See [audit](EMPLOYER-AUDIT.md).
- Combined initial import: 771 distinct opportunities, comprising 583 employer jobs and 188 competitions. Counts are a dated observation, not guaranteed ongoing coverage.
- Wadifa raw test: 189 records; one without employer/deadline quarantined. Metadata licence and visible attribution recorded.
- Migrations 003 and 004 add competition fields/deadline rules and enforce the owner's later decision for one public metadata/link catalog. Full ad text is not publicly readable.
- All 17 active sources passed the manual GitHub collection run: [40188117191](https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/40188117191), workflow_dispatch, 2026-10-25. Matching Supabase successful syncs verified for all 17; no failures.
- GitHub collection environment restricts deployment to main branches, with URL variable and secret key. main requires verify; force pushes/deletion disabled.
- Six-hour scheduling enabled after manual success: 00:17, 06:17, 12:17, 18:17 UTC.
- Public production domain and indexing verified. Vercel uses main for production.
- Typecheck, 22 tests, production build, CI and public HTTP smoke must pass for the final public-catalog commit.

## Remaining verification

The first regular schedule event after activation is due at 12:17 UTC on 2026-10-25, subject to GitHub delay. A follow-up in this chat checks event=schedule, source jobs and Supabase timestamps, then disables itself on verified completion. The manual run is not substituted for scheduled-run evidence.

Interactive browser/visual checks are unavailable because local browser use is disabled in Work settings. HTTP/SSR tests cover public API, filters, details, original links, attribution, retired access page and absence of full descriptions.

## Scope change

After the initial approved-source-only rollout, the owner explicitly requested no private website and selected public job facts plus links, with full advertisements left on original websites. This supersedes the earlier private-preview/public-clearance staging plan. It does not claim employer licences for full-description republication.
