# Technology coverage audit — 2026-11-09

The owner requested more technology-oriented listings. Five new employer feeds passed full technical collection, Morocco filtering and URL-based duplicate grouping.

| Employer       | Provider   | Distinct Morocco listings | Last 30 days | Requests |
| -------------- | ---------- | ------------------------: | -----------: | -------: |
| Artefact       | Greenhouse |                         7 |            0 |        1 |
| Arcsen         | Workable   |                         1 |            1 |        1 |
| Harmattan AI   | Ashby      |                        28 |            6 |        1 |
| The Flex       | Ashby      |                         7 |            2 |        1 |
| SupportYourApp | Workable   |                         2 |            2 |        1 |
| Total          |            |                        45 |           11 |        5 |

These are employer-feed roles across job families, not 45 software jobs or 45 recent jobs. Examples include Arcsen Salesforce Developer; The Flex Software Engineer - North Africa; Artefact AI Engineer, Junior/Senior Data Engineer and Data Scientist; Harmattan embedded software, computer vision, systems and software deployment roles; SupportYourApp technical networking support. Harmattan also includes mechanical/industrial engineering, operations, HR and finance. The Flex and SupportYourApp include non-engineering roles. Only explicit Morocco locations are included; worldwide/EMEA/remote alone is insufficient.

Older postings retain their true publication dates, including Artefact postings first published in 2023–2025. They are available only when selecting all dates. Source presence is not a guarantee that an employer still accepts applications.

## Connector evidence

- [Ashby public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api) documents an all-published-postings feed, secondary locations, publishedAt, isListed and workplaceType. The collector validates schema/version, unique IDs, original-link host/board/ID and pagination/count indicators. It excludes unlisted postings and imports metadata only. It checks primary and secondary addresses independently so a foreign city cannot become a Morocco city filter. Full-time is not treated as CDI. Malformed dates or potentially incomplete feeds fail reconciliation.
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) documents first_published. The existing collector now reads this field when provided and never falls back to updated_at. Unknown dates remain unknown; metadata totals and pagination hints are checked before reconciliation. Existing Morocco filtering and duplicate checks remain in place.
- Workable uses the previously tested public widget connector and merges location variants by original shortcode.
- Feed URLs, collection timestamps and counts are recorded in src/lib/tech-employers.json. Reproduce only this audit with: pnpm exec tsx scripts/audit-tech-sources.ts --only=artefact,arcsen,harmattan-ai,the-flex,supportyourapp. Local audit output excludes descriptions.

## Publication scope and rollout

The metadata/original-link scope follows the owner's explicit later public catalog decision recorded in docs/LAUNCH.md, rather than the earlier private/reuse-clearance staging plan. No licence to republish full advertisements is asserted. SQL migrations preserve existing blocked, disabled or other publication decisions on conflict; collectors cannot overwrite operator publication status.

Migrations: 202611090001_ashby adds the provider constraint; 202611090002_technology_metadata_sources adds only the five new metadata sources. The owner explicitly approved this exact production update on 2026-11-09, replacing separate reuse-clearance staging for these five sources' metadata. Both migrations were applied transactionally in production; all five rows were verified enabled and approved. Tested commit 88a4aa5 was merged into main and deployed successfully.

Collection was dispatched through GitHub's existing protected collection environment. The rollout evidence below records the completed refresh and public verification. The existing six-hour schedule and max-parallel 2 remain unchanged. Database write credentials remain exclusively in GitHub. For suspension set the affected source enabled=false in Supabase; the collector respects this before fetching and committing. Rolling back code does not remove listings, so suspend affected sources as well if needed.

## Production verification

- Application commit: 88a4aa5f2e825119d4e14ddb7c0162a9a686d924 on main. Main CI [42704803906](https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/42704803906) passed; Vercel production deployment succeeded.
- Manual collection [42704834178](https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/42704834178): 26/27 source jobs succeeded. All five added feeds succeeded. Actual executing-step intervals showed maximum concurrency two. The overall run correctly reports failure because the existing Veolia feed was rejected.
- Public API verification at 2026-11-09T21:49:14Z confirmed 45 distinct group keys across the five new feeds, 11 within 30 days, matching the audit table. Each response contained Morocco metadata and HTTPS original links, with empty descriptions. Pagination was traversed completely.
- Supabase source last_success_at exactly matched the latest successful sync_runs.finished_at for each new feed: Artefact 21:48:06.781612 UTC (7); Arcsen 21:48:21.668661 (1); Harmattan AI 21:48:22.949189 (28); The Flex 21:48:38.888793 (7); SupportYourApp 21:48:40.918582 (2). All dates are 2026-11-09.
- Veolia investigation: direct complete collector read returned three current Morocco listings versus ten active database rows. The database suspicious-drop guard rejected reconciliation (P0001), retained all ten records, and left last_success_at at 06:40:51.405988 UTC. No safeguard or source permission was changed. This existing-source drop requires investigation before accepting a reduced reconciliation; it does not invalidate the five new imports.
- Final production smoke checks passed after collection: public Supabase API, approved sources, empty descriptions, competition attribution and official notices, detail links, indexing, default 30-day filtering, and all-dates query preservation. A browser check followed Arcsen search to Salesforce Developer detail and then the live original Workable page. No application was submitted.
- Local validation before merge: typecheck, all 36 tests (including PostgreSQL/PGlite migration and publication-boundary tests), production build, and git diff --check passed. The six-hour refresh schedule is unchanged. Listings and counts will change on future collections.
