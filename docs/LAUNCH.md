# Expansion and public launch evidence

## Implementation baseline

- Additional employers audited: 20; nine qualifying private feeds, 183 distinct job groups; eleven zero-result feeds disabled. See [audit](EMPLOYER-AUDIT.md).
- Wadifa feed test: 189 records, 188 usable competitions. One record has neither employer nor deadline and is quarantined. All imported metadata retains original source/official links.
- Competition migration applied to Supabase project `bynzprawodlkldfslzxg`. Wadifa licence approval recorded independently from collection; employer approvals remain pending.
- Local production HTTP smoke against real Supabase: 188 public competitions, zero employer listings; source attribution, official links, deadline text, type filter and approved-only sources verified.
- Browser interaction/visual verification is unavailable in this session because local browser use is disabled in Work settings. HTTP/server-rendered checks do not replace a fresh browser walkthrough.

## Release gates

1. Full typecheck, 22 regression tests (including real PostgreSQL migrations/RLS), production build, diff check and GitHub CI.
2. Merge reviewed implementation into `main`; verify Vercel production deployment commit and `githubCommitRef=main`.
3. Public production HTTP smoke with no auth cookie/key; internal preview retains key gate and noindex.
4. GitHub `collection` environment: main-only branch policy, project URL variable and Supabase secret key. A manual full matrix run must succeed before enabling the schedule.
5. Confirm a subsequent GitHub Actions run has `event=schedule`, successful source jobs and matching new Supabase sync timestamps. Record its URL and times; do not substitute a manual dispatch.
6. Enable Production-only indexing after the public smoke passes.

Live run URLs and remaining gates are reported at delivery; this checklist itself does not assert unattended collection has already run.
