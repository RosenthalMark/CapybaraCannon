# Architecture Decision Records (ADRs)

This document records the architectural and engineering decisions made during the development of **Capybara Cannon**, documenting context, options considered, decisions taken, and resulting consequences.

---

## ADR-001: Zero-Dependency Vanilla ES6 & Canvas 2D vs. Game Engines

### Status: Accepted

### Context
When building a web-based physics launch game, developers frequently default to heavy game frameworks (e.g. Phaser, PixiJS, BabylonJS) or compiled engines (Unity WebGL, Godot Web). We needed to evaluate whether a framework was necessary or if a vanilla web stack offered superior engineering advantages.

### Decision
Build the entire engine using pure **ES6 JavaScript Modules and the native HTML5 Canvas 2D API**, with zero external runtime dependencies.

### Consequences
- **Pros**:
  - Instant page loads (< 50ms) with zero bundle bloat and zero npm dependency vulnerabilities.
  - Complete control over sub-step timing, memory allocation, and render passes.
  - Maximum educational and portfolio impact for engineering reviews (e.g., Codefi AI Builders Lab).
  - High portability across modern desktop and mobile browsers.
- **Cons**:
  - Requires writing bespoke systems for camera tracking, particle systems, parallax rendering, and physics integration from first principles.

---

## ADR-002: Procedural Web Audio API Synthesis vs. Prerecorded Audio Assets

### Status: Accepted

### Context
Arcade games typically require dozens of short audio clips (explosions, bounces, chimes, pops, whistles). Bundling numerous `.wav` or `.mp3` files introduces HTTP overhead, asset latency, decoding delays, and licensing complexities.

### Decision
Synthesize all in-flight sound effects procedurally at runtime using the **Web Audio API** (`OscillatorNode`, `GainNode`, `BiquadFilterNode`, and synthesized white-noise buffers). Prerecorded audio is reserved strictly for complex musical compositions (such as the title theme).

### Consequences
- **Pros**:
  - 0 KB network payload for sound effects.
  - Instant, zero-latency playback with dynamic real-time parameter modulation (e.g. pitch bend tied to velocity, rumble depth tied to blast power).
  - Eliminates third-party sound asset licensing liabilities.
- **Cons**:
  - Sound design must be coded mathematically using frequency ramps and envelope curves rather than adjusted in a Digital Audio Workstation (DAW).

---

## ADR-003: Bespoke Sub-Stepped Physics with Coulomb Friction vs. Physics Engines

### Status: Accepted

### Context
Standard 2D physics engines like Matter.js or Box2D provide general-purpose rigid body simulation. However, launch-physics games (e.g. *Kitten Cannon*, *Learn to Fly*) require non-standard arcade dynamics: intentional velocity snags, trampoline bounce restitution, high-velocity drag, aerodynamic lift, and definitive slope stopping without micro-jitter.

### Decision
Implement a custom 2D projectile physics solver operating with multi-pass sub-stepping (\( \Delta t / 4 \)) and Coulomb rolling resistance (\( 420\text{ px/s}^2 \)).

### Consequences
- **Pros**:
  - Exact tuning of arcade-specific interactions (e.g. Cacti scrub 84% speed; Mud Pits absorb 100% of vertical bounce; TNT adds directed kinetic impulses).
  - Eliminates physics jitter and infinite slope rolling.
  - Computational footprint is minuscule compared to general-purpose constraint solvers.
- **Cons**:
  - Continuous collision detection must be explicitly maintained for fast-moving projectiles against dynamic terrain.

---

## ADR-004: Native 16:9 Letterboxed Title Overlay vs. Canvas-Reconstructed UI

### Status: Accepted

### Context
The game includes a bespoke 1920×1080 title artwork graphic (`assets/art/title-screen-1080p.png`) featuring hand-lettered, slanted typography buttons with intricate drop shadows and pixel details. Reconstructing these buttons as standard HTML/CSS components would destroy visual fidelity and artist intent.

### Decision
Use the master artwork image inside a responsive 16:9 aspect-ratio container with invisible, precision-calibrated CSS hitboxes (`transform: rotate(-8.8deg)`) placed directly over the illustrated buttons:
1. Calibrated left buttons (PLAY, SHOP, ACCOUNT) with an exact `-8.8°` tilt and safe vertical spacing (33px neutral buffer gap between SHOP and ACCOUNT).
2. Isolated right buttons (CUSTOMIZE, CAPYBARA SELECTION) excluding decorative surrounding art (sticker capybaras, rainbow text arch, and peeking capybara).
3. 100% invisible production mode with zero borders or lines, accompanied by a URL/console toggled development debug visualizer (`?debugHitboxes=1`).

### Consequences
- **Pros**:
  - 100% visual fidelity to original master artwork.
  - Zero button distortion or typography mismatch across viewports.
  - Native accessibility and keyboard/click event handling via transparent DOM button elements.
  - Zero accidental clicks between adjacent buttons.
- **Cons**:
  - Button coordinates must be measured and calibrated against the master 1920×1080 canvas pixel space.

---

## ADR-005: Public Showcase Portfolio Model with IP Boundary & Non-Permissive Licensing

### Status: Accepted

### Context
The project serves as a showcase of software engineering craft for peers, evaluators, and prospective partners. However, the game concept, original characters, artwork, and commercial roadmap represent valuable intellectual property that must not be released into the public domain under permissive open-source terms (e.g. MIT/Apache).

### Decision
Adopt a **Dual-Boundary Showcase Strategy**:
1. The public repository serves as an open, verifiable engineering demonstration with complete code transparency, architectural documentation, and live demo access.
2. The license is explicitly **proprietary / showcase** (All Rights Reserved), granting rights for inspection, education, and review while strictly reserving all commercial exploitation, rehosting, and derivative game production.
3. Sensitive commercial logic, private backend services, and monetization infrastructure are kept in separate private repositories.

### Consequences
- **Pros**:
  - Establishes a verifiable, timestamped public Git history demonstrating provenance and technical leadership.
  - Protects intellectual property from unauthorized commercial duplication.
  - Clear, professional legal boundary suitable for corporate or acquisition review.
- **Cons**:
  - Third-party open-source contributors cannot freely redistribute forks without commercial clarification.

---

## ADR-006: Automated Playwright Regression Layer for Visual UI & Hitbox Calibration

### Status: Accepted

### Context
Mapping invisible CSS hitboxes over static, hand-drawn 2D artwork is susceptible to subtle geometric regressions during stylesheet refactoring, DOM restructuring, or responsive letterboxing changes. Relying solely on manual clicking cannot systematically prevent accidental button overlap or boundary drift.

### Decision
Establish an automated end-to-end regression testing layer using **Playwright Python** (`tests/test_title_hitboxes.py`) running headless Chromium against a fixed 1920×1080 viewport. The test suite programmatically asserts:
1. All 5 navigation buttons activate their respective game states or modal views.
2. The neutral buffer gap between SHOP and ACCOUNT never triggers either modal.
3. Clicks on surrounding decorative artwork (miniature sticker capybaras, rainbow header, peeking capybara) are completely ignored.
4. Production hitboxes remain 100% invisible, and the developer debug visualizer functions as expected.

### Consequences
- **Pros**:
  - Instant automated regression verification for any future UI or CSS changes.
  - Pixel-exact coordinate assertions preventing hitbox drift or overlap.
  - Automatically captures visual evidence and debug snapshots (`tests/screenshots/`).
- **Cons**:
  - Requires Python `playwright` environment and browser binaries for automated test execution.

---

## ADR-007: Architectural Separation of CUSTOMIZE (Character Outfit Workbench) vs. SHOP (Living Interactive Location)

### Status: Accepted (Design Direction & Architectural Constraint)

### Context
In casual arcade games, character customization and storefronts are frequently implemented as flat, generic item-grid menus or spreadsheet-like inventory forms. Applying a generic menu pattern to Capybara Cannon would strip away the game's whimsical charm and undermine the tactile character connection. Furthermore, treating the Shop as solely a cosmetics purchasing menu would severely constrain future narrative, questing, and minigame expansions.

### Decision
Establish a fundamental architectural separation between the **CUSTOMIZE** and **SHOP** subsystems:

1. **CUSTOMIZE = Character & Equipment Outfitting Workbench**:
   - Centered on a prominent, side-view capybara character mannequin.
   - Surrounded by directional callouts/arrows terminating in interactive category buttons (Hats, Hair, Shirts, Pants, Skirts, Shoes, Earrings, Necklaces, Rings, Accessories).
   - Category selection opens a focused secondary preview panel where items can be inspected, toggled, and equipped directly onto the mannequin before returning to the main workbench.
   - Features dedicated equipment-specific sub-screens (e.g. Capybara cosmetics, Jetpack upgrades, Special Power slots) rather than merging everything into one flat list.
   - Future Special Power progression slots are visible but mysterious/locked.

2. **SHOP = Living Interactive Location Containing a Store**:
   - Structured as an extensible, illustrated environment (capybara shopkeeper behind a counter with physical merchandise displays like racks and shelves) rather than a static purchase grid.
   - The Shopkeeper possesses modular, non-blocking behavioral loops (idle, lookAround, blink, sneeze, eatOrange, duckUnderCounter, impatience states, sign flips, counter bell call-backs).
   - Reusable popup scaffolding is triggered by interacting with in-world displays (e.g., clicking the clothes rack opens the shirt purchasing dialog).
   - Hosts run-specific **Shopkeeper Challenges** (dynamic in-flight objectives such as retrieving a "Solid Gold Orange", gathering dropped fruit, or meeting distance goals), supporting an expandable pool of challenges with a hard limit of two concurrently active objectives.
   - Extensible for future environmental animations, store minigames, secret interactions, and quirky dialogues.

3. **Architectural Principle: "Leave doors open; don't build the rooms yet"**:
   - The player profile and data layer (Feature 0.2) must provide clean, extensible storage structures for currency, inventory, equipped gear, and active challenge markers.
   - Zero premature code abstraction, dummy asset generation, or hardcoded challenge pools will be built prior to their respective scheduled milestones.

### Consequences
- **Pros**:
  - Clear UX identity: SHOP is where items and quests are **acquired**; CUSTOMIZE is where items and powers are **equipped**.
  - Prevents premature architectural dead-ends; ensures the runtime profile schema easily supports future challenges and equipment slots.
  - Shopkeeper behavior engine can grow organically via small, modular action definitions.
- **Cons**:
  - Requires dedicated custom background illustration and sprite assets from Mark prior to full Shop/Customize implementation.

---

## ADR-005: Jetpack Movement Architecture & State Separation

### Status: Accepted & Implemented (Stage 2)

### Context
The long-term vision of Capybara Cannon includes hybrid gameplay alternating between ballistic cannon launch, airborne jetpack flight, and ground runner phases. Introducing jetpack movement without careful state boundary isolation risks corrupting the existing working cannon launch physics, air drag, and Zen Boost systems.

### Decision
1. **Explicit FSM State `JETPACK_FLIGHT`**:
   - Differentiate ballistic flight (`FLIGHT`) from player-controlled jetpack flight (`JETPACK_FLIGHT`).
   - Normal launches remain in `FLIGHT` unless jetpack flight is explicitly engaged.
2. **Unified Input Abstraction Routing**:
   - In `JETPACK_FLIGHT`, `onActionDown()` sets `capybara.isThrusting = true`.
   - `onActionUp()` sets `capybara.isThrusting = false`.
   - Desktop Spacebar and mobile touch feed the exact same action pipeline.
3. **Deterministic Physics Contract**:
   - Jetpack applies upward vertical acceleration ($1,600\text{ px/s}^2$) against downward gravity ($680\text{ px/s}^2$).
   - Horizontal velocity ($v_x$) and aerodynamic drag remain completely intact; no teleports, velocity resets, or snapping.
   - When thrust is released, gravity takes over naturally.
   - Ground collision, bouncing, sliding, and stop detection execute identically via shared physics substeps.
4. **Decoupled Prototype Triggers**:
   - Jetpack state can be entered deterministically via `KeyJ` on desktop, the `#jetpackDevBtn` HUD button on mobile touch, and `?jetpack=1` URL query parameter.
   - Production launch flow is not polluted by hardcoding automatic jetpacks for all launches.
5. **Strict Scope Isolation**:
   - Fuel systems (Stage 3), runner mechanics (Stage 4/5), and power-up drop engines remain explicitly excluded.

### Consequences
- **Pros**:
  - Full backward compatibility: all existing ballistic launch and title tests pass 100%.
  - Zero disruption to camera tracking, obstacle collisions, or distance scoring.
  - Ready for seamless plug-in of fuel consumption in Stage 3 and world pickups in future stages.
- **Cons**:
  - Requires maintaining temporary developer trigger entry points until pickup items are placed in the world.

---

## ADR-006: Modular Customization Sockets (Wardrobe, Parachutes, and Jetpack Workbench)

### Status: Accepted

### Context
Customization is a cornerstone of player expression, retention, and seasonal progression. To prevent ad-hoc asset creation that becomes difficult to rig and scale in code, we needed to formalize the exact cosmetic slot taxonomy for both the Capybara character and the Jetpack vehicle before UI implementation.

### Decision
1. **Zero-Stat Cosmetic Purity**:
   - All customizable items across every socket are 100% cosmetic with zero impact on physics, launch speed, lift, drag, or fuel capacity.
2. **Capybara Wardrobe & Universal Slots (9 Sockets)**:
   - **7 Character Sockets:** `hat`, `hair`, `eyewear`, `top`, `bottom`, `shoes`, `accessory` (neck/jewelry).
   - **2 Universal FX / Vehicle Sockets:** `trail` (emission particles active across cannon launch, flight, and runner), `parachute` (canopy skins deployed on descent).
3. **Dedicated Jetpack Workshop (4 Modular Sockets)**:
   - `chassis`: Visual backpack body model (Twin Chrome, Fizzy Pop Cans, Cyber Battery, Hinoki Keg, Firework Bundle).
   - `flame_fx`: Thruster particle plume (Combustion Fire, Rainbow Neon Laser, Soda Foam, Hot Spring Steam, Confetti).
   - `nozzle`: Hardware tips (Chrome Cones, Cyber Vents, Bamboo Shoots, Dragon Mouths).
   - `audio_fx`: Synthesized/procedural thruster sound profile (Deep Roar, 8-bit Synth, Soda Hiss, Steam Whistle).
4. **Resolution & Viewport Standard**:
   - Full-screen interfaces (Shop, Customize Workbench, Wardrobe) authored at **`2560 × 1080 px`** ultrawide with critical UI elements, mannequins, and buttons strictly bounded within the central **`1920 × 1080 px`** safe zone.

### Consequences
- **Pros**:
  - Clear contract between art creation in Canva and engine sprite rendering.
  - Effortless cross-device responsive layout across modern iPhones (19.5:9), Androids (20:9), and standard 16:9 displays without letterboxing.
  - Enables modular data-driven seasonal content packs without altering core physics loops.
- **Cons**:
  - Requires layering render passes to draw clothing and equipment in correct z-index order (e.g. hair over hat vs hat over hair).


