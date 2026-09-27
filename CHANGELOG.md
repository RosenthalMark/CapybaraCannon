# Changelog

All notable changes to **Capybara Cannon** are documented in this file.
This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

---

## [0.1.0] - 2026-09-27

### Added
- **100% Visual Fidelity Title Screen**: Integrated native 1080p master artwork overlay (`assets/art/title-screen-1080p.png`) with strict 16:9 responsive letterboxing.
- **Precision Calibrated Hitboxes**: Calibrated sub-pixel button geometry with exact `-8.8°` CSS rotation matching the painted button slant for PLAY, SHOP, and ACCOUNT.
- **SHOP / ACCOUNT Separation**: Established a safe 33px neutral buffer gap between SHOP ($y = 818\text{ px}$) and ACCOUNT ($y = 967\text{ px}$), completely preventing accidental cross-activation.
- **Decorative Artwork Exclusion**: Calibrated CUSTOMIZE to strictly isolate the main button from miniature sticker capybaras ($y \ge 959\text{ px}$), and CAPYBARA SELECTION to exclude the rainbow text arch and peeking capybara ($y \ge 135\text{ px}$).
- **Clean Production Mode & Development Debug Visualizer**: Normal gameplay presents 100% invisible hitboxes with zero lines, borders, or shadows. Added developer debug overlay toggleable via URL parameter (`?debugHitboxes=1`) or console (`window.toggleHitboxDebug()`).
- **Automated Playwright Regression Suite**: Built automated test suite (`tests/test_title_hitboxes.py`) covering all 5 navigation buttons, SHOP/ACCOUNT boundary non-overlap, decorative art exclusion, and debug mode (8/8 tests passing).
- **Title Theme Audio Integration**: Implemented looping background music (`assets/audio/title-theme.m4a`) in `js/audio.js` with browser-compliant user gesture resume and auto-pause on launch.
- **Destination Screen Scaffolding ("Five Doors")**: Created dedicated modal architecture for **Shop**, **Account** (with live local best distance sync), **Customize**, and **Capybara Selection**, each with "Back to Title" navigation.
- **Results Navigation**: Added a "Title Screen" return button to the flight summary modal.
- **Professional Engineering Documentation**: Added comprehensive `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, `ASSET_REGISTRY.md`, and `LICENSE.md`.
- **Branding Assets**: Embedded executive banner graphics (`assets/branding/capybara-cannon-banner-dark.png`) for dark and light repository presentations.

---

## [0.0.3] - 2026-09-26

### Added
- **Exponential Launch Power Curve**: Replaced linear power scaling with a non-linear `power^1.75` curve, expanding muzzle velocity range from 480 px/s up to 3,100 px/s.
- **Dynamic Muzzle Recoil & Camera Shake**: Cannon barrel translates backwards with power-scaled recoil (14px–42px), accompanied by 8–28 intensity screen shake.
- **Scaled Audio Thump**: Synthesized cannon blast punch and low-frequency triangle drops scaled to launch charge intensity.

---

## [0.0.2] - 2026-09-26

### Added
- **Definitive Stopping Physics**: Implemented Coulomb rolling friction (\(420\text{ px/s}^2\)) and static slope friction thresholds, eliminating micro-gravity infinite sliding.
- **Hazard Mechanics**:
  - *Cacti*: Sharp velocity reduction on high-speed collision; instant full stop on low-speed impacts.
  - *Mud Pits*: Zero-bounce wetland bogs that rapidly decelerate sliding capybaras.
- **Top-3 Arcade Leaderboard**:
  - Distance qualification checking against player records.
  - Stylized name-entry modal (up to 12 uppercase characters) with keyboard Enter support.
  - Persistent browser storage via `localStorage`.
- **Zen Boost Tuning**: Rebalanced starting Zen Boost count from 3 down to 1.

---

## [0.0.1] - 2026-09-25

### Added
- **Core 2D Physics Loop**: Sub-stepped Verlet/Euler projectile flight simulation with terrain collision and bounce restitution.
- **Procedural Audio Synthesizer**: Procedural Web Audio API sound effects for explosions, trampoline boings, yuzu chimes, and splashes without external audio files.
- **Dynamic Procedural Terrain**: Endless rolling hills generated via multi-frequency trigonometric splines.
- **Vector Capybara Rig**: Parametric canvas rendering with dynamic facial expressions (`zen`, `happy`, `surprised`, `dizzy`) and bullet squash-and-stretch.
