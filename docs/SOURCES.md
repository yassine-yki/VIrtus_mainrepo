# Source audit history and current publication

## Current owner decision: one public metadata catalog

After the initial staging described below, the owner explicitly selected public job facts and original links on 2026-10-25. All 17 active feeds are now published: 583 employer jobs and 188 competitions at the verified import. Full advertisement descriptions are excluded from public API responses and direct public database column access. There is no private website or review-key login. Operational publication is not a claim of a separate full-text republication licence. See [current operations](OPERATIONS.md).

The following pending/private statuses document the earlier audit stage, not current live visibility. New sources still register as pending until an operator explicitly activates them; collectors cannot change that decision.

## Historical staged source audit

Technical access and permission to republish are separate. No source is automatically approved because a GET endpoint is readable. Counts change; the live collection performed during implementation returned 400 records before duplicate grouping. That is a dated review snapshot, not a market-coverage claim.

| Feed              | Provider        | Employer        | Implementation              | Public publication |
| ----------------- | --------------- | --------------- | --------------------------- | ------------------ |
| `accor`           | SmartRecruiters | Accor           | Implemented and live tested | Pending            |
| `accorhotel`      | SmartRecruiters | Accor           | Implemented and live tested | Pending            |
| `alten`           | SmartRecruiters | ALTEN           | Implemented and live tested | Pending            |
| `devoteam`        | SmartRecruiters | Devoteam        | Implemented and live tested | Pending            |
| `sqli`            | SmartRecruiters | SQLI            | Implemented and live tested | Pending            |
| `nuitee`          | Greenhouse      | Nuitée          | Implemented and live tested | Pending            |
| `energy-recovery` | Lever           | Energy Recovery | Implemented and live tested | Pending            |

## Access contracts

- SmartRecruiters: public destination, `country=ma`, maximum 100 records per page, full detail retrieval. Changed totals, duplicate IDs and incomplete pagination invalidate the run.
- Greenhouse: published board listings with content; only locations explicitly identifying Morocco or a recognized Moroccan city are retained. `updated_at` is not treated as a publication date.
- Lever: public postings with bounded pagination; eligibility must identify Morocco. “Remote” without Morocco eligibility is not included.
- Requests only target three allowlisted API hosts. Response-provided `ref` URLs are not fetched blindly. Application links require HTTPS.
- Descriptions are converted into plain text, never rendered as source HTML.
- SmartRecruiters uses its city field, not the administrative region, to avoid treating `Rabat-Salé-Kénitra` as three job locations. Explicit multi-city values are retained.
- `Full-time` is a working schedule and does not imply CDI. Missing fields remain unknown.

Official references:

- [SmartRecruiters Posting API](https://developers.smartrecruiters.com/docs/endpoints)
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board)
- [Lever Postings API](https://github.com/lever/postings-api)

## Additional websites

Dreamjob, Emploi-public, MarocAnnonces, MonCallCenter and Stagiaires.ma remain candidates. Each needs an access/reuse review and a source-specific collector with fixtures before activation. Public competition deadlines need separate expiry handling.

ReKrute and Emploi.ma have restrictive published terms; do not enable scraping without an appropriate agreement. LinkedIn is not a launch dependency and has no connector in this repository. No CAPTCHA, account restriction or access-control bypass is implemented.

## Approving a source

An administrator should record the applicable licence, permission or agreement, permitted fields, attribution/link requirements, refresh limits and evidence date. Update only the corresponding database source row to `approved`; keep the evidence in `permission_note`. Use `blocked` to stop display immediately. Do not edit RLS to make pending records public.

Coverage currently leans toward engineering, IT and hospitality. It is not representative of the whole Moroccan labor market.

## Expansion on 2026-10-25

The [additional employer audit](EMPLOYER-AUDIT.md) records 20 tested feeds. Nine passed complete collection with 183 Morocco records / 183 distinct job groups and are enabled for private collection. Eleven zero-result feeds remain disabled. All new employer feeds remain pending public publication approval.

Wadifa Info is a separate `wadifa` integration for public-sector competitions, not an HTML scraper. Its [developer terms](https://www.wadifa-info.com/developpeurs), checked 2026-10-25, explicitly offer metadata under CC BY 4.0 including commercial reuse. Cards and details retain a visible clickable `Source : Wadifa Info` link to each source item without `nofollow`; details also identify the licence and adapted metadata. The main action opens the official Emploi-public notice. We do not copy PDFs, salaries or applicant data.

The direct feed check returned 189 items; 188 have usable metadata. Item 96340 lacks an employer and deadline and is excluded with a collection warning. This is a dated observation. Feed counts describe announcements, not the number of open positions, and reads independently remove closed deadlines. Missing city data remains `Maroc` with no city filter key. The operator approval is recorded in Supabase; a collector cannot approve itself.
