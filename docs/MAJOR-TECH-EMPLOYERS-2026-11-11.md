# Major technology employer audit - 2026-11-11

The owner authorized the next expansion into major Moroccan technology employers. Publication scope remains job facts and original links only; full advertisements stay at the employer. No new account, application submission, paid service, outreach, or private catalog is introduced.

| Employer             | Official careers page                           | Audit result                                                                      | Distinct Morocco listings | Source publication date within 30 days |
| -------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------: | -------------------------------------: |
| Capgemini            | https://www.capgemini.com/ma-en/job-search/     | Complete, enabled                                                                 |                       181 |                                    181 |
| CGI                  | https://www.cgi.com/maroc/fr/carrieres          | Complete, enabled                                                                 |                        18 |                                     14 |
| Cegedim              | https://careers.cegedim.com/fr/annonces         | Complete, enabled                                                                 |                         3 |                                      1 |
| Orange / Sofrecom    | https://orange.jobs/fr/fr/orange-business/maroc | Disabled: incomplete pagination                                                   |              Not imported |                           Not imported |
| DXC                  | https://careers.dxc.com/job-search-results/     | Deferred: official site identified, complete Morocco search adapter not validated |              Not imported |                           Not imported |
| HPS                  | https://www.hps-worldwide.com/join-us           | Deferred: under-construction page directs candidates to email                     |              Not imported |                           Not imported |
| **Added feed total** |                                                 |                                                                                   |                   **202** |                                **196** |

Counts are a dated audit, not guaranteed inventory or a count of newly created positions. These employer feeds include software, data, cloud, QA, industrial engineering and some other functions. Capgemini's original job pages currently report recent publication dates for all 181 records; those are employer-reported dates and may reflect republication. We do not substitute API index/update timestamps or first observation dates. Cegedim retains an original 2023 publication date despite later republication metadata.

## Collection evidence

- Capgemini's own frontend exposes `https://cg-jobstream-api.azurewebsites.net/api/job-search`. Its current Morocco scope is `country_code=ma-en`; records carry `country_code=en-ma`. Two search pages plus 181 original careers pages were collected (183 requests). Stable count/total, unique IDs, country, active status and canonical application hosts/paths are checked. Publication comes from the original careers page JobPosting microdata. The API index/update timestamps are ignored. Examples include Java/Angular/Quarkus Software Engineer, Software Engineer CIAM/IAM, DevOps Cloud Engineer and Data Engineer roles; many other roles concern industrial engineering.
- CGI's official Morocco page links to `https://cgi.njoyn.com/corp/xweb/xweb.asp?CLID=21001&page=joblisting&CountryID=MA&lang=2`. The search reported 19 rows, all present. One explicitly foreign row was excluded, and 18 original JobPosting detail pages confirmed Morocco country and publication date (19 requests). Any future truncated table fails reconciliation. Examples include Senior AI Engineer / Java Spring Boot, Data Engineer, ServiceNow Developer and Cloud/Databricks/Talend/DevOps PFE roles.
- Cegedim's own frontend uses the DigitalRecruiters public careers search POST endpoint, locale `fr_FR`. The complete global page was inspected, then each candidate with an explicit known Morocco location was confirmed by detail country metadata (four requests in the successful audit). Original `jsonld.datePosted` is used rather than `republished_at`. Public job facts only are persisted; no salary, applicant record, contact email or full advertisement is stored. A recent Nuxt/Vue/TypeScript developer role is included.
- Orange's Morocco page reported 62 rows. One complete offset traversal returned only 57 unique IDs because relevance ordering changed between pages. The collector rejects duplicates/incomplete responses and remains disabled; no database approval row is added. Its search `postedDate` and JSON-LD `datePosted` refresh old ads, so the prepared connector reads the explicitly labelled original publication date instead. Alternate public widget probes did not establish a complete feed. Future activation requires a reproducible complete result set.
- DXC's official search uses a different public careers frontend. Its original company page links to the search, but this audit did not establish a complete Morocco import. HPS's join-us page currently offers email applications rather than an enumerable current-job feed. Neither is counted as coverage.

Reproduce validated feeds with `pnpm exec tsx scripts/audit-tech-sources.ts --only=capgemini,cgi,cegedim`. Registry evidence lives in `src/lib/tech-employers.json`. HTML detail requests are paced at least 350 ms apart per host, use HTTPS allowlisted hosts, reject redirects and non-HTML responses, and retain the existing bounded retries/timeouts. Each source reconciles atomically only after the entire feed succeeds.

## Validation and rollout

Typecheck, all 45 tests including PostgreSQL/PGlite, production build and diff checks passed locally. Tests exercise complete pagination, duplicates, truncation, changed totals, explicit foreign countries, unsafe URLs, original dates, absent dates, malformed metadata and preservation of existing operator suspension/publication state.

Migration `202611110001_major_tech_employers` adds only Capgemini, CGI and Cegedim under the already-supported `html` provider. Existing rows are preserved with `ON CONFLICT DO NOTHING`; collectors cannot change publication approval. The database write secret remains in GitHub's protected collection environment. The six-hour schedule, two-source concurrency limit, drop protection and failed-run retention remain in effect.

Suspend an affected source by setting `enabled=false` in Supabase; revert the application commit if required. Never bypass a suspicious-drop rejection merely to make a workflow green.

## Production verification - 2026-11-15

Migration registration was verified in production: all three sources are enabled and approved. Implementation commit `767029ec911ee34d8f92b8e91e790ca4de152ae2` was fast-forwarded to `main`. [Main CI passed](https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/43705948697), and [Vercel deployment succeeded](https://vercel.com/yassines-projects-25fc69a3/virtus-jobs/ABBpScQLkenHvyLG6tLNpZsi9vxw).

The [manual production collection](https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/43705965875) completed with 29 of 30 source jobs successful. All three new collectors succeeded. Source execution intervals, measured from actual step start times rather than queued job timestamps, showed a maximum concurrency of two.

| Source | Distinct public jobs, all dates | Published within 30 days | Supabase successful sync, UTC |
| --- | ---: | ---: | --- |
| Capgemini | 182 | 182 | 2026-11-15 10:58:18.041075 |
| CGI | 18 | 13 | 2026-11-15 10:57:29.904419 |
| Cegedim | 0 | 0 | 2026-11-15 10:57:48.480209 |
| **Added public coverage** | **200** | **195** | |

Each source's `last_success_at` exactly matched its successful `sync_runs.finished_at`, within its GitHub job interval. Cegedim changed since the November 11 audit: an independent complete read returned 69 global rows, none with a Morocco location. It remains configured for subsequent refreshes, but contributes no current public coverage. Orange remains disabled; DXC and HPS remain deferred.

The 200 listings are newly added to Virtus, not necessarily newly created vacancies, and include industrial engineering and other roles alongside software/data/cloud jobs. Public API pagination was traversed completely, with distinct grouping, Morocco country, empty descriptions and HTTPS original links checked. Search, source/date filters, detail pages, and original employer links were verified for Capgemini and CGI. The browser flow found CGI's Senior AI Engineer / Java Spring Boot role and opened the matching original CGI vacancy. Public access required no review key.

The post-import public smoke check passed: 410 employer jobs and 364 competitions under the default 30-day filter (774 opportunities), and 1,332 opportunities with all dates selected. Attribution, original links, indexing, and date-filter preservation passed. These are point-in-time catalog counts, not a promise of permanent inventory.

**Existing refresh issue:** Veolia alone failed with database code `P0001`. An independent complete feed read returned 3 current jobs against 10 retained active rows, meeting the existing greater-than-50-percent drop rejection. Its last successful sync remained `2026-11-09 06:40:51.405988+00`; the failed attempt was recorded at `2026-11-15 10:54:18.648326+00`. No retention or drop protection was bypassed. The aggregate workflow is therefore red despite all new collectors succeeding; Veolia requires a separate reviewed reconciliation of the missing listings.
