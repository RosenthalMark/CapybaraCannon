# Changelog

All notable changes to **Capybara Cannon** are documented in this file.
This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- **Cannon Loading Animation & Occlusion**:
  - Implemented `CANNON_LOADING` finite state machine state executing a 5-phase physical intro sequence: `ENTER` (ground waddle with stepping paws), `CLIMB` (scramble up carriage wheel to muzzle), `BARREL_ENTRY` (slide into cannon bore), `BARREL_PAUSE` (barrel rumble and muzzle dust puff), and `HEAD_POP` (elastic head pop-out into ready pose).
  - Split-layer cannon barrel occlusion: Capybara head renders inside the cannon barrel bore with the metallic bronze muzzle rim cleanly overlapping the neck.
  - Interactive aiming anchor: Capybara head stays visibly loaded at the muzzle, rotating seamlessly with the barrel during `AIMING` and pulling back into the barrel during `CHARGING`.
  - Added tap / Space fast-forward support to skip directly into aiming/charging.
  - Automated Playwright test suite (`tests/test_cannon_loading.py`) with 7/7 passing tests.
- **Decorative Orange Removal**:
  - Removed decorative `drawYuzuOnHead()` visual presentation from the Capybara character model while 100% preserving floating gameplay Yuzus, Citrus Turbo impulse, Zen Boost awards, stats, and particles.
- **Jetpack Flight Envelope & Cannon Angle Limits**:
  - Implemented ground-relative hybrid flight envelope with progressive thrust attenuation across a 120px soft buffer zone (400px–520px altitude) and hard ceiling safety clamp at 520px altitude, preventing infinite vertical climbs while eliminating sticky ceiling hover.
  - Restricted cannon elevation angles to a playable range of $10^\circ\text{–}60^\circ$ across mouse, touch, and keyboard aiming, ensuring strong horizontal momentum on launch.
  - Automated Playwright test suite (`tests/test_flight_envelope.py`) with 10/10 passing tests.
- **Stage 2: First Playable Jetpack Movement**:
  - Implemented `JETPACK_FLIGHT` finite state machine mode distinguishing ballistic flight from jetpack-controlled flight.
  - Added deterministic upward thrust acceleration ($1,600\text{ px/s}^2$) via unified `onActionDown()` and release via `onActionUp()`.
  - Upward acceleration counteracts downward gravity ($680\text{ px/s}^2$), allowing controlled climbs while preserving forward ballistic momentum ($v_x$).
  - Added flight attitude stabilization when thrusting, orienting the capybara toward a forward climb pitch.
  - Procedural twin-canister jetpack rendering with animated flickering exhaust flame nozzles and drift particles.
  - Testable developer triggers: 'J' key on desktop, `#jetpackDevBtn` HUD button for mobile touch, and `?jetpack=1` auto-equip URL query parameter.
  - Automated Playwright test suite (`tests/test_jetpack_movement.py`) with 7/7 passing tests.
- **Stage 1: Input Event Abstraction**:
  - Unified `onActionDown()` and `onActionUp()` input dispatch pipeline across desktop Spacebar, canvas click/touch, and launch button.
  - Automated Playwright test suite (`tests/test_input_abstraction.py`) with 6/6 passing tests.

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
