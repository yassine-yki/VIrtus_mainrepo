# Morocco-eligible remote coverage — 2026-11-21

## Decision

Publish the validated Wikimedia Foundation employer feed under the owner's existing approval for public job facts and original links. Keep Himalayas out of the production registry until completeness, eligibility and overlap can be verified. No imported full advertisements are stored for the new employer.

## Source audit

| Source               | Public endpoint / identifier                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                             | Publication                            |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Wikimedia Foundation | Greenhouse board wikimedia                           | 12 total posts; 10 explicitly Morocco-eligible; 5 tech; 4 recent across all families, 3 recent tech                                                                                                                                                                                                                                                                                                                                                | Qualifying metadata and original links |
| Himalayas            | Country MA search, exclude_worldwide=true            | First traversal rejected overlapping page IDs. Fresh diagnostic traversal found 399 unique IDs among the first 400 records, then HTTP 429. A slower strict traversal reached 63 pages and ended after 1,249 unique records against the reported total of 1,265; reconciliation was rejected as truncated. The reported total is not an addition count. The unfiltered cursor endpoint ignored country filters and reported 120,172 global records. | Disabled; no production import         |
| Canonical            | Greenhouse board canonical                           | Complete 318/318 response; no explicit Morocco location or Morocco mention in ads                                                                                                                                                                                                                                                                                                                                                                  | Not enabled                            |
| GitLab               | Greenhouse board gitlab                              | Complete 246/246 response; no explicit Morocco location or Morocco mention in ads                                                                                                                                                                                                                                                                                                                                                                  | Not enabled                            |
| Remote               | Greenhouse board remotecom                           | Empty 0/0 response; not evidence of all company vacancies                                                                                                                                                                                                                                                                                                                                                                                          | Not enabled                            |
| Zapier / Automattic  | Candidate Greenhouse identifiers zapier / automattic | Both returned 404; identifiers are unsupported, not verified empty companies                                                                                                                                                                                                                                                                                                                                                                       | Not enabled                            |
| Remotive             | Public API, Morocco text query                       | Returned 16 entries including foreign-only/worldwide roles; no verified Morocco coverage from the sample                                                                                                                                                                                                                                                                                                                                           | Not enabled                            |

The reproducible read-only command is pnpm exec tsx scripts/audit-remote-feeds.ts. It saves metadata-only evidence under ignored data/audits/remote-morocco.json. Himalayas traversal validates offsets, stable totals, unique GUIDs, a full record count and unchanged first-page identity; failures never authorize reconciliation. A successful pagination audit alone is not publication approval.

## Evidence and mapping

- Official employer careers page: https://wikimediafoundation.org/jobs/ links to its Greenhouse jobs and names Morocco among current hiring locations.
- Complete public ATS feed: https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs?content=true . Compare meta.total with all returned posts and reject duplicate IDs, malformed records, foreign links or invalid original publication dates.
- Require each individual remote job's country list to name Morocco. A corporate remote policy, EMEA label, worldwide label or incidental Morocco mention is insufficient.
- Exclude the US-only internship (8268853) and Sub-Saharan-Africa-restricted program role (8280142), despite the latter's generic hiring-country footer.
- Direct examples: https://job-boards.greenhouse.io/wikimedia/jobs/8397050 and https://job-boards.greenhouse.io/wikimedia/jobs/8268142 . The Android contract requires at least four working hours between 15:00 and 21:00 UTC; display that condition without assuming the candidate can meet it.
- Use first_published, never updated_at, first-seen time or collection time as publication date. Unknown dates remain excluded from recent filters. Keep the default last 30 days and the explicit all-dates option.
- Remote jobs use Maroc and no city key. Full time does not imply CDI. No US salary range is presented as Moroccan compensation.
- Retain a factual eligibility note, source URL, applicable work-authorization requirement and audited timezone note inside existing versioned tech metadata; full text is discarded after classification.
- Classification v2 adds explicit Site Reliability Engineer and product-management titles naming Data Platforms or Mobile Apps. Generic product management and UX remain unclassified. Existing listings refresh through the normal collection schedule; there is no title-only overwrite of existing description-derived tags.

## Reuse and overlap

Owner-approved scope covers job facts and original links, not a general full-advertisement licence. Each card identifies Wikimedia Foundation and links to the employer's ATS. Existing canonical company + original URL duplicate grouping is unchanged. The pre-rollout public catalog contained 1,071 employer jobs and no Wikimedia employer or job URL; all 10 accepted records have distinct original links and group keys.

Himalayas API terms (https://himalayas.app/terms, clause 113) allow commercial display with visible attribution, require every Apply action to use the supplied applicationLink, prohibit downstream feeds/Google Jobs/JobPosting redistribution, and require expiry removal. Its pubDate is last updated, not original publication: https://himalayas.app/docs/remote-jobs-api . No Himalayas jobs are being republished or exposed through Virtus APIs.

## Operation and rollback

- Apply scripts/register-remote-sources.sql once to register the approved source. ON CONFLICT DO NOTHING preserves any existing operator suspension or blocked status. No schema or candidate-data changes are required.
- Existing protected GitHub collection credentials remain unchanged. For a Wikimedia-only manual refresh, dispatch collect.yml on main with source=wikimedia. Blank input preserves the entire enabled matrix; the six-hour schedule and max-parallel two are unchanged.
- Verify a successful source job, ten committed rows, matching latest successful sync_runs.finished_at and sources.last_success_at, five public tech rows and three recent tech rows. Counts are observations, not guarantees for subsequent refreshes.
- Public browsing: /tech?workplace=remote ; all-dates browsing: /tech?workplace=remote&days=0 . Filters survive pagination and detail return links. Detail pages show the evidence and timezone condition.
- Suspend only the affected source with sources.enabled=false. Existing registration and commit gates honor suspension. Reverting code alone does not unpublish stored jobs.
- Candidate profiles and Hugging Face extraction remain disabled. Wadifa and Veolia collectors are outside this change.

## Validation

Typecheck, 65 tests including PostgreSQL/PGlite, and production build pass locally. The existing 100-job title fixture retains 100% inclusion precision and 100% emitted-tag precision at 78.125% recall; it is an agent-reviewed title fixture, not a human candidate pilot. New cases cover country evidence, foreign-role restrictions, missing dates, malformed/partial feeds, unsafe URLs, pagination, source suspension and persisted remote evidence.

Production verification is recorded after rollout below.
