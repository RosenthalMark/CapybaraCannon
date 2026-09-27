# Asset & Intellectual Property Provenance Registry

This registry tracks the origin, ownership, legal rights, and repository status of all creative, visual, auditory, and procedural assets used in **Capybara Cannon**.

---

## IP & Asset Registry

| Asset File / Identifier | Description & Role | Created By | Provenance / Source | Rights Status | Repo Visibility | Notes / Specifications |
|:---|:---|:---|:---|:---|:---|:---|
| `assets/branding/capybara-cannon-banner-dark.png` | Primary Repository Banner (Dark Theme) | Mark Rosenthal | Original Creation | Sole Ownership | Public | 1750×400 PNG, optimized for dark backgrounds & GitHub README |
| `assets/branding/capybara-cannon-banner-light.png` | Repository Banner (Light Theme) | Mark Rosenthal | Original Creation | Sole Ownership | Public | 1750×400 PNG, light variant |
| `assets/art/title-screen-1080p.png` | Title Screen Master Artwork | Mark Rosenthal | Original Creation | Sole Ownership | Public | 1920×1080 px, native 16:9 pixel-perfect master art |
| `assets/audio/title-theme.m4a` | Title Screen Background Theme | Mark Rosenthal | Original Production | Sole Ownership | Public | Looping master theme (AAC/m4a audio) |
| `js/capybara.js` (Vector Rigs) | Procedural Vector Capybara Rigs | Mark Rosenthal | Original Code | Sole Ownership | Public | Dynamic parametric canvas renderer with squash/stretch & expressions |
| `js/audio.js` (Synth Graphs) | Procedural Web Audio Sound Synthesizer | Mark Rosenthal | Original Code | Sole Ownership | Public | Zero-dependency procedural synthesis (sub-bass, noise bursts, FM boings, chirps) |
| `js/world.js` & `js/particles.js` | Procedural Environment & FX | Mark Rosenthal | Original Code | Sole Ownership | Public | Procedural rolling spline terrain, parallax background layers, emitter physics |
| `Fredoka` & `Luckiest Guy` | Arcade Typography | Vernon Adams / Astigmatic | Google Fonts | SIL Open Font License 1.1 | Public (CDN) | Web font dependencies loaded via Google Fonts CDN |

---

## Provenance Guidelines

1. **Clean Asset Hygiene**: Every asset added to the project must be given semantic, kebab-case, professional naming (e.g. `title-screen-1080p.png`, `capybara-cannon-banner-dark.png`) avoiding unstructured scratch names.
2. **Third-Party Separation**: Any future third-party libraries, sound samples, or vector icons must have their respective licenses documented in this table prior to merging into main.
3. **Dual-Repo Boundary**: Proprietary production infrastructure, backend services, monetization databases, and private trade-secret formulas remain isolated in private repositories and are excluded from public distribution.
