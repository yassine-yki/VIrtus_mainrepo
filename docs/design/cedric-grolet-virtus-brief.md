# Cedric Grolet frontend analysis and Virtus implementation brief

Prepared 22 November 2026 for the Virtus job website.

Use the reference's oversized typography, restrained interface, strong photography, and image transitions to give Virtus a distinctive identity. Keep job search visible from the first screen and retain the working catalog underneath. The recommended result is a dramatic introduction followed by a clear, practical search experience.

This is a design and implementation handoff. The current application has not been redesigned.

## Scope and evidence

Desktop inspection covered the global entry screen, its Paris selection layer, the Opéra catalog, a product quick view, and the maison editorial page. Public HTML, CSS, and JavaScript were also inspected. London was checked at the content level as a second destination.

Desktop measurements below use a 1304 × 884 viewport. Mobile behavior is described from the delivered CSS and JavaScript; it has not been visually tested on a phone. This covers the principal frontend patterns, not every regional variation, checkout state, private source file, or backend implementation.

The sections headed Reference describe the inspected site. The sections headed Virtus specify the proposed adaptation.

## Reference page structure

| Surface | Frontend role | Relevant lesson for Virtus |
| --- | --- | --- |
| Global entry | A full-screen typographic list chooses a destination. Paris opens a second selection layer; other entries lead to destination sites. | Large text can serve as navigation and brand expression. |
| Paris selection | An oversized city heading, a horizontal list of establishments, changing background photography, and a return control. | Use a small number of meaningful choices and a clear route back. |
| Destination catalog | Sticky navigation, a split introduction and pickup control, then a photograph-led product grid. | Separate the expressive introduction from the task interface. |
| Product quick view | A large overlay divides gallery imagery from product details and purchase controls. Opening it changes the URL. | Detail information can have a strong hierarchy, but job details should keep their existing standalone route. |
| Maison editorial page | A wide photographic opening followed by centered display headings and sections mixing text and images. | Apply editorial spacing to the sources and methodology page. |

Sources: [global entry](https://cedric-grolet.com/en/), [Opéra catalog](https://cedric-grolet.com/opera/en/), [product](https://cedric-grolet.com/opera/en/product/buchette-santa-claus26), [maison](https://cedric-grolet.com/opera/en/edito/our-maison), [London](https://cedric-grolet.com/london/).

## Reference visual system

### Composition

The entry screen begins with a black background, a small white wordmark at the upper left, and enormous destination names stacked toward the left. Language links and copyright occupy the bottom corners. Empty space on the right gives the type room to dominate. There are no conventional navigation cards on this screen.

Photography appears behind the interface in response to selection. The image fills the viewport and uses a dark overlay to support text. The visual effect comes mainly from scale, image quality, and restraint.

Inside the shop, the palette becomes mostly white and black. The catalog has four photographic columns at the inspected desktop width. Hovering a tile reveals a dark treatment with product information. The editorial page uses a large image across the opening viewport.

### Measured typography and spacing

The public [theme stylesheet](https://cedric-grolet.com/opera/themes/symediane/assets/css/theme.css?v=1.83) establishes these entry-screen rules:

| Element | Below 768 px | From 768 px | From 1280 px |
| --- | --- | --- | --- |
| Destination names | 44 px, line height 1.2, centered | 7 rem, left aligned | 9 rem, line height 1 |
| Paris layer heading | 80 px | 12 rem | 14 rem |
| Paris establishment list | Vertical, 20 px gap | Horizontal, 10 rem gap | Same rule |
| Header padding | 30 px 15 px | 3.5 rem 5 rem | Same rule |

At the inspected desktop width, 9 rem resolved to 90 px. The wordmark measured 184 × 16 px; header padding resolved to 35 px vertically and 50 px horizontally. The destination list had a 3 px row gap. Footer type measured 12 px.

Display type uses La Grolet. Supporting text uses Akkurat. Their contrast creates much of the identity: expressive large lettering paired with quiet functional labels. Custom glyph shapes account for the apparent variation between letters.

### Motion and interaction

The [public theme script](https://cedric-grolet.com/opera/themes/symediane/assets/js/theme.js?v=1.83) and stylesheet show:

- Entry hover reveals a fixed background image using a 400 ms fade.
- The active destination becomes outlined with a 2 px text stroke. Other destination labels change color.
- The chocolate destination has a warm accent, defined as #f1e4b2.
- Clicking Paris activates the establishment layer; its return controls reverse that state.
- Desktop pointer entry selects an establishment image. Touch detection starts a 3-second image cycle within the open layer.
- Entry labels use a 600 ms upward fade, starting at translateY(2rem), with animation order multiplied by a 75 ms delay.

These effects can be built with normal layout, CSS opacity and transforms, and a small amount of interaction state. This inspection does not establish a need for WebGL or a heavy animation framework.

### Technical architecture

Public markup identifies PrestaShop, a Symediane theme, custom elements, and jQuery-based interactions. Responsive picture sources and lazy-loading attributes appear in the HTML. The footer credits Symediane.

The reference's commerce platform is separate from its visual language. Virtus can reproduce the design principles within its existing Next.js application.

### Patterns to adapt carefully

The reference prioritizes exploration. Job seekers need to compare information quickly.

| Reference pattern | Virtus adaptation |
| --- | --- |
| Destination gate before the catalog | Put category navigation and a working search form on the same opening screen. |
| Huge display labels | Reserve them for the introduction and category navigation. Keep results readable at normal sizes. |
| Full-screen image changes | Confine them to the introduction, with stable contrast and no layout movement. |
| Product information revealed on hover | Keep job title, employer, location, contract, dates, and actions visible continuously. |
| Product quick view | Retain the existing job detail page and return-to-results link. |
| Automatic image cycling | Use a static mobile image or black background. |
| Commercial promotional overlay | Keep the initial job-search screen clear. |

## Virtus design direction

Build a black introductory stage with oversized white category names on the left and a compact white search panel on the right. Below it, transition directly into a light catalog.

The visual relationship to the reference should be obvious through type scale, composition, background imagery, and restrained controls. Virtus should still feel like a service for finding work in Morocco.

### Desktop arrangement

```text
virtus.                  Les offres    Tech    Nos sources
---------------------------------------------------------
Votre prochain emploi, au Maroc.

EMPLOIS                       Rechercher une opportunité
TECH                          [Métier ou entreprise     ]
STAGES                        [Ville                    ]
CONCOURS                      [Rechercher             → ]
À DISTANCE                    Sans compte · À la source

                    Explorer les offres ↓
---------------------------------------------------------
Sources identifiées · actualisation réelle si disponible

Les offres                         Nombre réel · Tri
[Filtres]             Intitulé du poste          Détails →
                      Entreprise · Ville · Contrat
                      Publication · Source · Site d'origine
                      -----------------------------------
                      Offre suivante
```

This is a layout specification, not a requirement to reproduce the spacing of this text diagram.

### Opening screen

- Use the existing Virtus wordmark and mark. Express the new direction through layout and typography.
- Keep one clear h1: “Votre prochain emploi, au Maroc.”
- Use the five short category labels in the diagram. Their size and vertical rhythm should recall the reference's destination list.
- Keep the search form visible beside the category list on a typical desktop viewport.
- Let the stage expand when content requires it. Avoid a fixed height that clips controls on short screens.
- Keep a visible link to the results anchor.
- When the URL contains a search, filters, or pagination, prioritize the results position and use a compact introduction. Do not make users repeatedly pass through the large stage.
- Retain French as the interface language. Do not add an inactive language switch.

### Category behavior

Use existing filter helpers and real catalog data. Category links must work as ordinary links without decorative JavaScript.

| Label | Intended catalog context |
| --- | --- |
| EMPLOIS | General employer jobs with kind=job. |
| TECH | Existing /tech route, with tech=1 and employer-job semantics. |
| STAGES | General employer jobs with contract=Stage. |
| CONCOURS | Public competitions with kind=competition. |
| À DISTANCE | General employer jobs with workplace=remote, retaining the existing Morocco eligibility meaning. |

For the introduction's category presets, preserve the user's keyword, city, date window, and sorting when applicable; reset pagination to 1. Clear category-specific criteria that conflict with the chosen destination. For example, leaving the tech route for general competitions must clear tech-specific filters.

Normal search edits, filter removal, sorting, and pagination must retain their current behavior. Do not apply category-reset rules to those operations.

The current default date window is 30 days. Avoid labeling a default preset as every available job unless it explicitly requests all dates. Generate links through filtersUrl and parseFilters instead of maintaining a second query-string implementation.

### Image behavior

Start with black as the reliable base state. On desktop hover or keyboard focus, a category may reveal an editorial image behind the stage and outline its label.

Keep the other labels legible. The reference's switch to dark inactive text should not be copied if it reduces contrast over Virtus imagery. The search panel must stay stable and opaque.

Use the existing local hero image for the first implementation if it fits the chosen crop. Additional images should depict relevant Moroccan work, learning, or urban environments with consistent lighting and color treatment. Use owned, commissioned, generated, or appropriately licensed assets. Treat category images as decorative rather than evidence of a hiring relationship.

Do not reuse the reference's photos, logo, or hosted font files. If no suitable category assets exist, ship the typographic composition with a black background before adding a coordinated image set.

### Search and results

Retain the current keyword field, city selection, and search submission behavior. Style them as clear rectangular controls in the white panel, with a dark primary button and visible field labels.

The catalog should use a light background, thin separators, generous spacing, and readable rows. A job row should present:

1. Job title as the strongest element.
2. Employer and location.
3. Contract and workplace, when provided.
4. Publication date and collection/source context with their existing distinct meanings.
5. Existing technology and eligibility metadata where relevant.
6. Separate links for internal details and the original listing.

Keep competition deadlines and the official-notice action prominent. Preserve missing-value wording and salary handling. Do not create urgency labels, fabricated counts, or verification claims.

Keep the current filter sidebar on larger screens and an accessible disclosure on smaller screens. Preserve active-filter chips, clear actions, sorting, result count, pagination, empty results, and error states.

### Job detail and supporting pages

Restyle the existing detail page with a large readable title, organized facts, and a clearly separated application panel. Keep the original-listing action and all attribution visible. On mobile, stack the panel into the reading flow.

Use the same typography, spacing, and neutral palette on /sources. Explain source coverage and methodology through a strong heading and readable sections. Existing access controls and profile feature gates must remain effective.

## Virtus proposed design tokens

These are starting values for Virtus, not measurements of the reference.

| Token | Starting value |
| --- | --- |
| Intro background | #080808 |
| Intro text | #FAFAF7 |
| Catalog background | #FAFAF7 or white |
| Main text | #161616 |
| Secondary text | #626262 on a light surface; verify contrast |
| Separator | #DADAD4 |
| Accent | Existing Virtus orange, used sparingly on dark surfaces |
| Desktop horizontal padding | 48–64 px |
| Tablet horizontal padding | 28–40 px |
| Mobile horizontal padding | 16 px at 320–374 px; 20 px from 375 px |
| Desktop category type | Fluid range around 64–88 px |
| Mobile category type | Around 32–36 px on the narrowest phones; 36–44 px where space permits |
| Body type | 16 px with approximately 1.5 line height |
| Job titles | Approximately 21–25 px |
| Functional labels | 13–14 px where comfortably readable |
| Panel radius | 0–8 px |
| Background transition | 350–450 ms |
| Control transition | 150–200 ms |

Keep the existing Manrope and DM Sans pairing for the first pass, but make headings substantially larger and tighter. If that does not achieve the intended character, choose one licensed display family after reviewing actual French text. Do not install several font families merely to imitate the reference's custom letterforms.

Prefer a small set of spacing values and flat surfaces. Use outlines and underlines for interaction; avoid decorative shadows and excessive badges.

## Responsive and accessibility requirements

Virtus must be designed for mobile and desktop from the same routes, data, and components. Start with a usable single-column layout, then add desktop columns where space permits. The values below are proposed Virtus rules, not additional measurements of the reference site.

### Layout by screen width

| Viewport width | Header and introduction | Search and catalog |
| --- | --- | --- |
| 320–374 px | Compact wordmark and menu; 16 px side padding; short h1; category type around 32–36 px. | Single-column form and results; full-width submit button; inline collapsible filters. |
| 375–767 px | 20 px side padding; category type around 36–44 px; static image or black introduction. | Search before categories; vertically stacked job information and actions. |
| 768–1023 px | 28–40 px side padding; retain compact navigation if the full menu is crowded; reduce decorative type before reducing control sizes. | Form below the introduction when necessary; one results column; filters above results. |
| 1024 px and above | 48–64 px side padding; full navigation; category list and search panel side by side. | Filter sidebar beside readable job rows; detail content beside the application panel. |
| Wide desktop | Center the content within a maximum width around 1440 px; the stage background can span the viewport. | Limit reading widths and row lengths rather than stretching text across the screen. |

Use available content space to resolve awkward layouts near a breakpoint. A tablet in landscape or a desktop at browser zoom may need the compact arrangement.

The existing filter disclosure currently changes behavior at 901 px, matching the current 900 px catalog CSS breakpoint. For this proposed design, align the catalog layout and disclosure logic at 1024 px. Update both together so the 901–1023 px range does not display inconsistent filter behavior.

### Mobile page arrangement

```text
virtus.                            Menu
---------------------------------------
Votre prochain emploi,
au Maroc.

Rechercher une opportunité
Métier ou entreprise
[                                     ]
Ville
[ Tout le Maroc                     v ]
[ Rechercher                        > ]

EMPLOIS
TECH
STAGES
CONCOURS
À DISTANCE
Explorer les offres
---------------------------------------
Sources et date réelle si disponible

Les offres
[ Filtres (2)                       v ]
Critères actifs, avec retour à la ligne
Nombre réel              [ Trier    v ]

Intitulé du poste sur plusieurs lignes
Entreprise
Ville · Contrat · Mode de travail
Date de publication · Source
[ Détails ]       [ Site d'origine   > ]
---------------------------------------
Offre suivante

[ Précédent ]  Page 1 / N  [ Suivant ]
```

The diagram represents content order. Derive counts, filter state, dates, and pagination from the current application.

### Mobile header and navigation

- Aim for a compact header around 56–64 px high, allowing it to grow with text zoom. Keep the wordmark and a labeled “Menu” control visible.
- Collapse navigation when it no longer fits comfortably. Keep “Les offres”, “Tech”, and “Nos sources” available; show the profile link only when its existing feature gate permits it.
- Prefer a native disclosure that expands within the page. It must work with keyboard and touch and remain available without JavaScript.
- If a modal navigation panel is necessary, provide focus containment, Escape and close actions, focus return, and a usable non-JavaScript alternative. Do not leave hidden links in the tab sequence.
- A sticky header must leave focused controls, anchor targets, and the top of job details visible. Avoid a second permanently fixed toolbar.
- Preserve navigation and filter state when changing orientation or resizing across breakpoints.

### Mobile introduction and search

- Place the h1 and working search form before the decorative category list. At 390 × 844, the keyword field, city field, and search button should be visible together without passing the category list.
- At shorter screen heights or larger text sizes, allow natural scrolling. Do not force the introduction into a fixed viewport height or hide overflow.
- Stack fields with visible labels, full-width inputs, and a full-width submit button. Use control text of at least 16 px and controls around 48 px high.
- Keep field values when validation or a request fails. Distinguish an unavailable catalog from a valid search with zero results.
- Keep the search button reachable while the software keyboard is open. Focused inputs must scroll into view; avoid fixed elements covering them.
- Keep category links direct: one tap follows the intended category. Do not require a tap to activate a hover preview first.
- Use black or one static decorative image on touch layouts. Disable automatic background cycling and avoid downloading every desktop hover image on mobile.
- For a filtered URL or a return from job details, keep the introduction compact and prioritize the results instead of returning the user to the top of a large hero.

### Mobile results and filters

- Use one column. Show result count, sorting, and an inline filter disclosure above the job list.
- Keep the existing disclosure pattern for the first version. Do not introduce a filter drawer solely for visual effect.
- Let each filter control use the available width. Preserve every existing filter, including multi-select technology, role family, experience, language, and PFE controls on the tech route.
- Multi-select controls must be operable by touch without desktop modifier keys. Prefer usable native controls; if replacing them with checkbox groups, preserve their names, values, and multi-value submission semantics.
- Display an active-filter count and allow active chips to wrap. Give removal buttons clear accessible names and usable hit areas.
- Keep “Appliquer les filtres” and reset actions visible within the expanded form. Users should be able to review choices before submission.
- Search, filter changes, and sorting must preserve the intended URL state and reset pagination where the existing behavior requires it.
- Keep pagination as ordinary links. At narrow widths, use previous/next controls and current-page context rather than squeezing many numbered links into one row.
- Empty and error states must explain the next action without clearing the user's search unexpectedly.

### Mobile job rows and detail pages

- Keep titles fully readable and allow employer names, locations, technology tags, and source links to wrap. Do not hide essential information behind ellipses or horizontal scrolling.
- Keep contract, workplace, date context, competition deadline, and available source information visible without hover.
- Position details and original-source actions below the main facts. Let them stack at small widths; avoid nested interactive controls or an entire clickable row containing other links.
- On the detail page, use one column: return link, employer and title, essential facts, original-source application action, supporting information, and attribution.
- Keep the primary original-source action near the essential facts so users do not have to pass a long information section to find it. If markup is reorganized, preserve a sensible reading and tab order.
- Keep the distinction between internal details and applying on the original website explicit. Preserve the existing external-link behavior.
- Returning to results must retain filters and page state. Verify browser Back as well as the explicit return link.
- Start with the application action in normal document flow. Introduce a fixed bottom action only if testing shows it is necessary; it must respect safe areas and never cover content or the software keyboard.

### Shared accessibility and input rules

Use semantic links for destinations and buttons for actions. Keep one logical h1, the existing skip link, visible control labels, and a clear keyboard focus indicator. Use one set of meaningful content and form controls rather than duplicate mobile and desktop forms with divergent state or IDs.

Set interactive targets to at least 44 × 44 CSS px as a project design target, with space between adjacent actions. Small icons may sit inside larger buttons. Keep body text around 16 px, support browser text resizing, and allow long French labels to wrap.

Enable decorative hover previews only when the input device supports hover and a fine pointer. Keyboard focus may reveal the same preview, but it must remain optional. Touch, stylus, mouse, and keyboard must all reach the same content and actions. Decorative media must not intercept input.

Check text contrast on both solid backgrounds and actual image crops. Keep functional text solid even when category lettering is outlined. Never use color alone to indicate a selected category or filter.

When reduced motion is requested, remove entrance movement and automatic image changes. Make meaningful text visible even if animations or scripts fail. Search, filters, pagination, and destination links must remain functional with JavaScript disabled.

Keep source and methodology content readable in a single column on mobile. Reflow tables or provide clearly labeled local scrolling for genuinely tabular content; the page itself must not scroll horizontally. Stack footer links and source notes without dropping the application-at-source explanation.

### Mobile performance and browser behavior

Serve an appropriately sized image for the actual screen and reserve its layout space. Keep decorative imagery from delaying the search form. Lazy-load nonessential media below the opening view and avoid adding animation libraries for simple fades.

Respect display cutouts and safe areas wherever controls are placed near screen edges. Do not rely on a fixed viewport height for forms or overlays. Test the actual visible area while browser bars expand, collapse, and the keyboard opens.

Changing orientation must retain typed values and selected filters. Touch scrolling should remain native and vertical; no scroll hijacking or required swipe gestures.

### Responsive verification matrix

These checks are required for the eventual implementation. Adding these rules to the brief does not establish that the current website already passes them.

| Test size or condition | Required check |
| --- | --- |
| 320 × 568 | All controls remain usable, long labels wrap, and natural scrolling reaches every action. |
| 360 × 800 and 390 × 844 | Search appears before categories; form controls and job actions are easy to tap; no page overflow. |
| 430 × 932 | Extra width improves spacing without creating an unnecessary second results column. |
| 768 × 1024 and 1024 × 768 | Tablet portrait/landscape, breakpoint transitions, navigation, filters, and retained form values. |
| 1280 × 720 and 1440 × 900 | Desktop split composition, readable results, sidebar behavior, and short-screen access to search. |
| 200 percent browser zoom | Content reflows, controls stay reachable, and the layout can switch to compact mode. |
| iOS Safari and Android Chrome | Native selects, multi-select filters, keyboard open, touch input, Back navigation, and safe areas. |
| Desktop Chrome, Firefox, and Safari where available | Navigation, form submission, focus states, layout, and optional hover treatment. |
| Reduced motion, keyboard navigation, and JavaScript disabled | Content remains visible and core discovery actions work. |
| Slow network, missing image, empty results, and catalog error | Stable layout, usable form, preserved criteria, and accurate recovery messages. |

Use browser emulation for layout coverage and at least one real phone or a device testing service for keyboard and touch behavior when available. Record which environments were actually tested and identify any device checks that remain outstanding.

Capture desktop and mobile screenshots of the homepage, filtered results with filters open, a tech search, a job detail, and the sources page. Check interactions as well as screenshots.

## Repository implementation map

The inspected workspace currently uses Next.js 16.4.5, React 19.3.1, TypeScript, global CSS, and lucide-react. The homepage and tech route share the catalog component.

| Existing file | Role in the redesign |
| --- | --- |
| src/components/catalog-page.tsx | Retain server-side catalog composition; replace the hero presentation and restyle the results surface. |
| src/components/brand.tsx | Preserve brand identity and routes; update header and footer presentation. |
| src/components/job-card.tsx | Restyle the existing job information and actions. |
| src/components/filter-disclosure.tsx | Keep the accessible filter disclosure behavior. |
| src/components/tech-filters.tsx | Preserve tech filter options and submission semantics. |
| src/app/globals.css | Introduce cohesive tokens and styles; audit effects on all existing routes. |
| src/app/page.tsx | Keep the homepage entry and search-parameter contract. |
| src/app/tech/page.tsx | Keep tech mode and its route. |
| src/app/offres/[id]/page.tsx | Retain job-detail lookup and validated return URL. |
| src/app/sources/page.tsx | Apply the shared visual system to methodology content. |
| src/lib/search.ts | Reuse parsing, filter URLs, and return URL helpers. |
| public/images/virtus-search-hero.webp | Existing image available for the initial visual pass. |
| docs/design/hero-photo.md | Existing provenance and context for that image. |

A small new interactive hero component is reasonable if needed for shared image state. Limit client-side state to that presentation. Keep catalog fetching and source logic in their existing server boundaries.

Before implementation, read AGENTS.md and the relevant installed guides under node_modules/next/dist/docs/. In particular, consult the server/client component, CSS, and image guides. The installed version's documentation takes precedence over remembered Next.js APIs.

Use CSS transitions before adding a motion dependency. Use optimized responsive images with reserved dimensions and appropriate sizes. Do not preload every category background. Keep a black fallback, avoid layout shifts, and stop background work when the introduction is offscreen.

## Scope boundaries

This redesign changes presentation. Preserve:

- Existing catalog retrieval, source visibility decisions, and job grouping.
- Query parameters q, city, contract, workplace, source, days, sort, kind, tech, family, technology, seniority, pfe, language, and page.
- The distinction between publication dates, source updates, and last-seen collection dates.
- Employer links, original-source attribution, remote eligibility evidence, and official competition notices.
- Detail-page return links and their validation.
- The /tech route, public-source explanation, access behavior, and conditional profile navigation.

Do not introduce an in-app application flow, login requirement for browsing, saved-job feature, invented employer partnerships, or a new backend as part of the visual work.

## Implementation sequence

1. Record screenshots of the current homepage, filtered results, tech page, job details, and sources page. Establish their working behavior before editing.
2. Build the shared palette, typography, header, and introduction composition using existing assets.
3. Connect category presets to existing filter helpers and add optional image previews.
4. Restyle results, filters, job details, sources, empty states, and error states.
5. Verify responsive layout, keyboard use, reduced motion, and normal navigation.
6. Run the relevant project checks and present desktop/mobile screenshots with a concise account of changes and remaining issues.

## Acceptance criteria

The implementation is complete when:

- The opening composition clearly reflects the reference's oversized type, restrained black canvas, and confident use of imagery.
- Users can submit a keyword/city search immediately.
- Every category link produces the intended real filter context and resets pagination correctly.
- Existing search, sorting, multi-select tech filters, filter removal, and pagination still work.
- Opening a job and returning to results preserves the relevant search state.
- Job metadata and source actions remain visible without hover.
- Counts and dates come from the existing result data.
- Competition deadlines, attribution, and remote eligibility information remain accurate.
- Missing images leave a usable black introduction.
- Missing JavaScript leaves working navigation and form submission.
- The responsive verification matrix passes at phone, tablet, and desktop widths, including a narrow 320 px phone and a short desktop viewport.
- Touch input, the software keyboard, browser Back, text zoom, and orientation changes preserve usable controls and the intended search state.
- Long French job titles and employer names wrap naturally.
- Keyboard focus is visible, and reduced motion removes decorative movement.
- The browser console has no new errors attributable to the redesign.
- pnpm typecheck, pnpm test, pnpm build, and git diff --check pass, or any environment limitation is reported precisely.

For performance, compare with the current page using the same device and network conditions. Check image loading, layout movement, and interaction responsiveness. Do not report an unmeasured performance score.

## Prompt to give the implementation agent

> Redesign the Virtus frontend using this document as the design specification. Use the Cedric Grolet reference for oversized typography, restrained black-and-white composition, editorial imagery, and subtle image transitions. Implement the proposed Virtus layout: a dramatic introduction with category navigation and an immediately usable search form, followed by clear light-background job results.
>
> First inspect the repository, AGENTS.md, and the relevant installed Next.js documentation. Preserve the existing functional application, URL-based filters, catalog data, tech route, job detail return flow, original-source links, attribution, dates, feature gates, and source methodology. Reuse the existing components and helpers.
>
> Apply the shared design to the homepage, tech results, filters, job rows, job details, header, footer, and sources page. Follow the detailed mobile, tablet, and desktop rules in the responsive section. Build the single-column mobile experience first, then add the desktop split layout and sidebar. Keep search before decorative categories on mobile, preserve usable touch filters and job actions, and align CSS and disclosure breakpoints. Keep desktop hover previews optional and decorative. Ensure keyboard, touch, reduced-motion, and JavaScript-disabled behavior remain usable.
>
> Use the existing local image for the first pass where appropriate. Use original or licensed additional assets. Keep the current stack and prefer CSS transitions with a small client component for presentation state.
>
> Complete implementation and verification against the acceptance criteria and responsive verification matrix. Present screenshots at desktop and mobile widths, list the browsers and devices actually tested, check software keyboard and browser Back behavior, and identify any remaining issues. Do not replace working behavior with mock data.

## Reference links

- [Global entry screen](https://cedric-grolet.com/en/)
- [Opéra catalog and quick views](https://cedric-grolet.com/opera/en/)
- [Inspected product URL](https://cedric-grolet.com/opera/en/product/buchette-santa-claus26)
- [Maison editorial layout](https://cedric-grolet.com/opera/en/edito/our-maison)
- [Booking destination](https://cedric-grolet.com/opera/en/edito/book-a-table)
- [London destination](https://cedric-grolet.com/london/)
- [Public theme stylesheet](https://cedric-grolet.com/opera/themes/symediane/assets/css/theme.css?v=1.83)
- [Public theme script](https://cedric-grolet.com/opera/themes/symediane/assets/js/theme.js?v=1.83)
- [Public catalog interaction script](https://cedric-grolet.com/opera/modules/symgrolet/views/js/front.js?v=1.83)
