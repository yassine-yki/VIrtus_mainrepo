# Technology employer expansion

Audited on **2026-11-05**, retaining the owner's public metadata/original-link scope and the last-30-days search default. This is an audit of published employer feeds, not a guarantee that an employer still accepts every application.

| Employer and official feed                                                                               | Morocco jobs | Distinct jobs | Published in last 30 days | Complete collection requests |
| -------------------------------------------------------------------------------------------------------- | -----------: | ------------: | ------------------------: | ---------------------------: |
| [Scalian](https://careers.smartrecruiters.com/Scalian) — SmartRecruiters `Scalian`                       |           71 |            71 |                        13 |                           72 |
| [Theodo](https://jobs.lever.co/theodo) — Lever `theodo`                                                  |            7 |             7 |                         0 |                            2 |
| [Alter Solutions](https://careers.smartrecruiters.com/AlterSolutions) — SmartRecruiters `AlterSolutions` |           20 |            20 |                         0 |                           21 |
| [Mindera](https://apply.workable.com/minderacraft/) — Workable `minderacraft`                            |            6 |             6 |                         1 |                            1 |
| [Infomineo](https://apply.workable.com/infomineo/) — Workable `infomineo`                                |            5 |             5 |                         1 |                            1 |
| **Total**                                                                                                |      **109** |       **109** |                    **15** |                       **97** |

These are employer-feed counts across job families, **not 109 software jobs or 109 recent jobs**. Scalian also publishes industrial engineering, finance and HR roles; Theodo also publishes HR and product roles. Recent technology examples include Scalian's Cloud & SysOps / Automation Engineer, Identity, OS & Datacenter Engineer and ERP Functional Support Engineer; Mindera's Senior Java Backend Engineer; and Infomineo's AI Architect. Older software, cloud, data and cybersecurity roles remain available under “Toutes les dates”; their publication dates are never reset on collection.

Registry/evidence: `src/lib/tech-employers.json`. Reproduce with `pnpm exec tsx scripts/audit-tech-sources.ts`; the script updates dated evidence and writes a description-free local audit to ignored `.local/tech-feed-audit.json`. It does not write Supabase or approve sources. Counts must be recomputed after hosted collection and URL-based duplicate grouping.

## Technical validation

- SmartRecruiters: full Morocco pagination, stable total, unique IDs and per-posting details through the existing connector.
- Lever: both pages through the first short page; explicit Casablanca/Morocco locations only.
- Workable: its [official careers integration documentation](https://help.workable.com/hc/en-us/articles/115012771647-Using-the-Workable-API-to-create-a-careers-page) documents the public all-published-jobs endpoint. The documented `www.workable.com/api/accounts/{account}` redirects to `apply.workable.com/api/v1/widget/accounts/{account}`. The connector uses this verified destination directly and omits `details=true`, so no full job descriptions or applicant data are requested.
- Workable's [job widget documentation](https://help.workable.com/hc/en-us/articles/115012801727-How-to-embed-jobs-on-your-website-job-widget) explains that one posting may repeat per location. Compatible variants merge by shortcode and original URL; conflicting title/date/employment metadata fails reconciliation. Mindera's 75 widget rows represent 35 global postings, of which six explicitly include Morocco.
- Hidden locations are excluded. Country code takes precedence over country text. Worldwide/EMEA/remote alone is insufficient. Only Moroccan cities enter city filters; country-only locations remain Maroc. Full time does not imply CDI. Missing publication dates remain unknown.
- Malformed schema, employer mismatch, suspicious pagination/count metadata, 1,000-row safety limit and unsafe original links fail closed. Database drop protection, failed-run retention and missing-job expiry remain unchanged.

## Publication and rollout

No separate licence to redistribute full advertisements was established. Public API documentation establishes technical access, not third-party republication permission. The owner requested more technology listings within the already approved public metadata/original-link scope. The operator migration records that decision for these five new sources; imported full descriptions stay inaccessible to public clients. Existing blocked, disabled, pending or approved source decisions are preserved on conflict. Collectors cannot approve sources.

Apply `20261105070631_tech_employer_feeds.sql` before merging the registry/collector release into main; the provider check must accept Workable before the scheduled jobs encounter it. Then run manual collection and verify all 22 source jobs, source timestamps, public filtering, attribution, original links and the unchanged 30-day default. The six-hour schedule and maximum two concurrent source jobs are unchanged. No source outreach was sent.

Candidate ATS identifiers that returned zero records or 404 during discovery were not treated as verified employer feeds or added as active coverage. Many Morocco employers use other systems. Sofrecom/Orange, Capgemini, CGI, DXC, HPS and Cegedim remain further integration candidates; remote-only global feeds were not relabelled Morocco to inflate counts.
