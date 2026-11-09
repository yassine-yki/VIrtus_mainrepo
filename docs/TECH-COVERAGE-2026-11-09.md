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

Migrations: 202611090001_ashby adds the provider constraint; 202611090002_technology_metadata_sources adds only the five new metadata sources. Production execution is awaiting the exact update approval requested after automatic approval review rejected the SQL Run action. No production collection or new-source publication has been claimed.

After approval: apply both migrations transactionally, merge verified code to main, dispatch collection through GitHub's existing protected collection environment, and verify the per-source success timestamps, public counts, filters, details and original links. The existing six-hour schedule and max-parallel 2 remain unchanged. Database write credentials remain exclusively in GitHub. For suspension set the affected source enabled=false in Supabase; the collector respects this before fetching and committing. Rolling back code does not remove listings, so suspend affected sources as well if needed.
