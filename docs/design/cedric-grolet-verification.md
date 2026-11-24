# Cedric Grolet inspired redesign verification

Reviewed 2026-11-24 against the approved design brief and the follow-up request for a distinct background for each hovered category.

## Delivery

- Branch: `codex/cedric-grolet-redesign`.
- Pull request: https://github.com/yassine-yki/VIrtus_mainrepo/pull/8
- Review preview: https://virtus-jobs-git-codex-cedric-365edd-yassines-projects-25fc69a3.vercel.app/
- Preview access uses the existing Vercel login protection. No protection settings were changed.
- Production remains on its existing revision pending design review.

## Automated checks

- Type checking, 79 tests (including PostgreSQL coverage), and the production build passed.
- GitHub push and pull-request CI passed for implementation commit `0d9626abd1d02de932dbd46f55c42dd2eeee8476`.
- CI evidence: https://github.com/yassine-yki/VIrtus_mainrepo/actions/runs/45292840812
- Vercel deployment succeeded: https://vercel.com/yassines-projects-25fc69a3/virtus-jobs/A6ek77Yv9kW2zj6DGw4VavZPRYcx
- Pure tests cover category presets, pagination reset, preserved search/date/sort context, repeated technology values, detail return URLs, and five distinct valid local WebP assets.
- Read-only HTTP checks against the local production build passed for home search, compact tech results, actual job details and source links, return query/page/date context, empty results, sources, and application-panel document order. Shell requests to the protected hosted preview reach Vercel login, so hosted interaction was verified in the authenticated browser.
- Existing production candidate page remains available and non-indexed; its unauthenticated profile API returns 401. No feature flags, credentials, sources, database logic, or collector behavior were changed.

## Browser checks actually performed

Browser: Codex in-app Chromium browser on Windows. This is responsive desktop emulation, not physical phone testing.

- Five separate backgrounds activate for Emplois, Tech, Stages, Concours, and A distance on the hosted preview. The four added assets are original generated images; provenance is recorded in `category-imagery.md`.
- Keyboard Tab from Tech to Stages changes the active background to Stages.
- This browser requests reduced motion. Manual background changes work instantly with computed transition duration of zero. Normal-motion CSS specifies a 400 ms opacity crossfade; its animation was not visually verified with reduced motion turned off.
- Background layers are omitted at mobile widths and on compact filtered pages. Images load on category interaction rather than in initial server markup.
- Responsive DOM geometry at actual widths 320, 390, 768, 1023, 1024, and 1440 CSS pixels showed no page-level horizontal overflow. On phones, the search panel precedes categories. Filters collapse below 1024 and expand on desktop after the media-query update.
- One tap on Tech navigates to the real tech catalog and its default 30-day context. Opening a real job shows its essential facts, original-source action, and a return link with the tech/date state. Browser Back restores that result URL.
- Search works with a temporary local proxy blocking all scripts and images. Native disclosures and repeated Python/SQL checkboxes submit both technology values and retain the query.
- The normal hosted browser console returned no warning/error entries during these checks. Script/image blocking errors in the deliberate no-JavaScript proxy are expected and excluded.

## Limits and remaining review

Screenshot capture repeatedly timed out in the browser tool on both local and hosted pages. No final screenshots could be saved; use the interactive review preview for visual approval. Earlier baseline screenshots were observed but are not retained as artifacts. Layout geometry and functional checks are not substitutes for a full visual review.

Physical iOS/Android software-keyboard behavior, Safari/Firefox, 200 percent text zoom, slow-network comparisons, and normal-motion animation still need device review. No unmeasured performance score is claimed.

The temporary local test proxy and production servers are stopped after verification. No test accounts or candidate profiles were created for this redesign.
