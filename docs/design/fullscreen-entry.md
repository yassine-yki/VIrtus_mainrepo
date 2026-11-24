# Full-screen entry and navigation performance

2026-11-24: the requested homepage replaces the earlier search-and-results composition. The entry route is now a full-screen category chooser. Search and listings live on `/offres` and `/tech`; the homepage contains neither catalog retrieval nor results beneath the fold.

- Homepage is prerendered as static content. A default decorative image covers the complete viewport immediately, including without JavaScript. Hover and keyboard focus switch category images on desktop; mobile categories remain one-tap destinations. At most two image layers render during a crossfade; late image responses cannot replace the latest requested category.
- The ordinary job catalog now uses `/offres`; legacy root search query URLs redirect with their parameters intact. URL builders and safe detail-return parsing support the new route. The existing `/tech` and job detail routes remain available.
- Dynamic catalog routes have server-rendered loading feedback and partial prefetching. Header catalog navigation uses client transitions. Search queries still use the current catalog and source visibility rules; no database, collector, authentication, or provider settings change.
- Existing DM Sans and Manrope Latin variable fonts are served locally (36,932 and 24,532 bytes). Their SIL Open Font Licenses are included under `public/fonts/`. The external Google Fonts CSS import has been removed. Original font sources: Google Fonts CSS API and the `google/fonts` repository's `ofl/dmsans/OFL.txt` and `ofl/manrope/OFL.txt`.

## Verification

Type checking, all 80 tests (including PostgreSQL coverage), production build, and whitespace checks pass. Build output identifies `/` as static.

HTTP smoke checks verify five entry destinations, one initial image and no catalog markup, legacy redirects preserving repeated technology values and pagination, catalog search, real job details and original links, selected tech filters, empty-state query retention, and local font references.

In-app Chromium responsive checks observed document dimensions equal to the viewport, with all five category destinations and footer visible, at actual sizes approximately 319x567, 389x843, 767x1024, 843x389, 1440x900, and 1280x600. A scroll gesture leaves the entry at scrollY=0. The local browser verified category hover and navigation to `/offres`, rendering real catalog jobs.

Baseline production homepage before this fix: 128,891 HTML bytes; one HTTP sample completed in 1,477 ms (1,394 ms to headers). New local production build: 12,563 HTML bytes, with no catalog query. Local timings are not directly comparable to remote timings. Hosted measurements should be taken after rollout; no Lighthouse or frame-rate score is claimed.

Responsive emulation is not physical iOS/Android testing. The browser requests reduced motion; intentional image swaps were tested instantly. Normal-motion CSS retains the 400 ms fade. No automatic animation or scrolling is required.
