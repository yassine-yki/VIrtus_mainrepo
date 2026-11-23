# Category background imagery

Created 23 November 2026 for the Virtus redesign. These are original generated decorative photographs, not photographs of candidates, employers, institutions or hiring partners. The reference website's photographs and fonts were not reused.

| Category   | Asset                                             | Subject                                                                      |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Emplois    | `public/images/virtus-search-hero.webp`           | Existing generated job-search photograph; provenance in `hero-photo.md`.     |
| Tech       | `public/images/virtus-category-tech.webp`         | Developer at a dual-monitor workstation in a Moroccan urban setting.         |
| Stages     | `public/images/virtus-category-internships.webp`  | Two adult students learning together with a laptop and notebooks.            |
| Concours   | `public/images/virtus-category-competitions.webp` | Generic Moroccan civic architecture, no specific institution or endorsement. |
| À distance | `public/images/virtus-category-remote.webp`       | Laptop workspace overlooking a Moroccan coastal city.                        |

Generated with the built-in Imagegen tool. Common prompt: one original landscape editorial photograph for a Morocco job service; warm natural light, restrained charcoal shadows, quiet dark space on the left for white text, visual subject near the centre; no text, logo or watermark. Each asset used its subject above. Encoded as 1672 x 941 WebP at quality 82; the four new assets total about 451 KB. Original generated PNGs are retained outside the repository.

Desktop category hover and keyboard focus request only the visited category image. After decoding, separate layers crossfade over 400 ms; stale completed requests cannot replace a newer selection. The search panel remains opaque. Leaving the category area returns to black unless keyboard focus remains there. Offscreen, compact, touch/mobile and reduced-motion states do not cycle backgrounds. Narrow layouts and reduced motion use the black stage; category links remain ordinary links with or without JavaScript.
