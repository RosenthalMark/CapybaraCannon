# Capybara Cannon — System Architecture & Engine Design

This document details the software architecture, simulation physics, audio synthesis pipeline, and rendering patterns powering **Capybara Cannon**.

---

## 🏛️ High-Level System Overview

Capybara Cannon is architected as a **pure zero-dependency web engine** utilizing modern ECMAScript modules, the native HTML5 Canvas 2D rendering pipeline, and the Web Audio API.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              GAME LOOP                                 │
│                   (requestAnimationFrame, delta-clamped)               │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
                ▼                                        ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│         STATE MACHINE         │        │         INPUT ENGINE          │
│ (TITLE, AIMING, CHARGING,     │◄───────┤ (Pointer, Touch, Keyboard,    │
│  FLIGHT, STOPPED, GAMEOVER)   │        │  Angle Calculation)           │
└───────────────┬───────────────┘        └───────────────────────────────┘
                │
                ├────────────────────────────────────────┬───────────────────────────────────────┐
                ▼                                        ▼                                       ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐       ┌───────────────────────────────┐
│        PHYSICS ENGINE         │        │        CANVAS RENDERER        │       │       PROCEDURAL AUDIO        │
│ • Sub-stepped Euler Solver    │        │ • Multi-pass Parallax Sky     │       │ • Web Audio Oscillator Graphs │
│ • Coulomb Rolling Resistance  │        │ • Procedural Spline Ground    │       │ • Synthesized Noise Bursts    │
│ • Restitution & Snag Hazards  │        │ • Parametric Vector Capybara  │       │ • Dynamic Pitch / Filter Ramps│
│ • Definitive Stop Threshold   │        │ • Particle FX & Screen Shake  │       │ • Background Theme Controller │
└───────────────────────────────┘        └───────────────────────────────┘       └───────────────────────────────┘
```

---

## ⚙️ Module Responsibilities

| Module | Core Responsibility | Key Classes / Exports |
|:---|:---|:---|
| [`js/main.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/main.js) | Central coordinator, game loop, camera tracking, and lifecycle management | `Game` |
| [`js/physics.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/physics.js) | Sub-stepped Newtonian projectile solver and contact mechanics | `PhysicsEngine` |
| [`js/world.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/world.js) | Procedural spline terrain, chunk manager, and parallax backgrounds | `World` |
| [`js/capybara.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/capybara.js) | Parametric capybara vector renderer, expressions, and squash/stretch | `Capybara` |
| [`js/obstacles.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/obstacles.js) | Procedural placement, collision hitboxes, and impulse responses | `Obstacle`, `Cactus`, `MudPit`, etc. |
| [`js/particles.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/particles.js) | High-performance particle emitter pool for blasts, smoke, and sparks | `ParticleSystem` |
| [`js/audio.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/audio.js) | Web Audio synthesizer and title music stream controller | `SoundManager` |
| [`js/ui.js`](file:///Users/markrosenthal/Desktop/GAMES/CapybaraCannon/js/ui.js) | DOM HUD, power gauge, modal scaffolding, and leaderboard persistence | `UIManager` |

---

## 🧮 Custom Physics Simulation

Unlike conventional web games that introduce heavy third-party physics libraries, Capybara Cannon uses a tailor-made **sub-stepped projectile solver** optimized for high-velocity launch arcade dynamics.

### 1. Sub-Stepping & Integration
High-speed projectiles can cause "tunneling" (passing through terrain between frames). To guarantee collision fidelity:
$$\Delta t_{\text{step}} = \frac{\Delta t}{4}$$
Each sub-step calculates aerodynamic drag and gravitational acceleration:
$$v_x(t + \Delta t) = v_x(t) \cdot (1 - C_{\text{drag}} \cdot \Delta t)$$
$$v_y(t + \Delta t) = v_y(t) + g \cdot \Delta t$$

### 2. Terrain Contact & Restitution
When the capybara's bounding circle penetrates the procedural ground spline:
1. Normal vector $\vec{n}$ and tangent vector $\vec{t}$ are calculated from the ground slope angle $\theta$.
2. Velocities are decomposed into normal ($v_n$) and tangential ($v_t$) components.
3. Normal restitution applies bounce elasticity ($e = 0.52$):
   $$v_n' = -e \cdot v_n$$
4. Tangential friction scrubs forward momentum ($f_t = 0.88$):
   $$v_t' = v_t \cdot f_t$$

### 3. Coulomb Rolling Resistance & Definitive Stopping
A common bug in launch games is infinite rolling caused by micro-gravity on subtle slopes. We solve this via a dual-phase friction model:
- **Coulomb Deceleration**: While in continuous ground contact, a constant deceleration force is subtracted directly from speed:
  $$v_{\text{roll}}(t + \Delta t) = \max\left(0, v_{\text{roll}}(t) - 420 \cdot \Delta t\right)$$
- **Static Hill Lock**: On slopes with gradient $< 18^\circ$, forward gravitational acceleration is neutralized by static friction when rolling below $50\text{ px/s}$.
- **Definitive Halt**: When total velocity drops below $14\text{ px/s}$, the capybara snaps immediately to $(v_x = 0, v_y = 0)$, stopping flight and transitioning state cleanly to `STOPPED`.

---

## 🔊 Procedural Audio Architecture

The game utilizes procedural audio synthesis to achieve zero network latency and a 0 KB sound effect payload:

```
[AudioContext] ──► [MasterGainNode (0.35)] ──► [Destination / Speakers]
                          ▲
       ┌──────────────────┼──────────────────┐
       │                  │                  │
[OscillatorNode]  [BiquadFilterNode]  [AudioBufferSource]
 (Sub-bass Booms)  (Explosion Crack)  (White Noise Blast)
```

- **Cannon Blast**: Employs an exponential frequency sweep from $280\text{ Hz} \to 24\text{ Hz}$ across $420\text{ ms}$ paired with a burst of high-passed white noise.
- **Trampoline Boing**: Dual-sine modulation executing a sharp pitch ascent followed by resonant decay.
- **Title Theme Stream**: Looping master music track (`assets/audio/title-theme.m4a`) managed with smooth volume fading and browser-safe user gesture resume hooks.

---

## 🖥️ Rendering & Coordinate Systems

The renderer utilizes a hierarchical transform stack:

1. **Screen Space (0, 0 to Viewport Width/Height)**: Draws parallax gradient sky, sun glow, and cloud layers.
2. **Camera Space**: Translates canvas context by:
   $$\text{Context Transform} = T\left(\frac{W}{2} + \text{shake}_x, \frac{H}{2} + \text{shake}_y\right) \times S(\text{zoom}) \times T(-x_{\text{cam}}, -y_{\text{cam}})$$
3. **World Space**: Evaluates procedural terrain curves, placed obstacles, and particle emitters.
4. **Local Entity Space**: Centers coordinates on the capybara body, applying angle rotation and velocity-oriented squash & stretch scaling:
   $$S_x = \text{squash}, \quad S_y = \frac{1}{\text{squash}}$$

---

## 🖼️ Title Screen & Hitbox Coordinate Architecture

The title screen preserves the master hand-painted 1920×1080 artwork (`assets/art/title-screen-1080p.png`) with 100% visual fidelity through a responsive letterboxed coordinate overlay.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RESPONSIVE 16:9 CONTAINER (#title-letterbox)         │
│                                                                        │
│   (Top-Right)                                 (Selection Hitbox)       │
│                                              ┌──────────────────────┐  │
│                                              │ CAPYBARA SELECTION   │  │
│                                              └──────────────────────┘  │
│                                                                        │
│   (Angled Left Navigation)                                             │
│  ┌──────────────────────┐                                              │
│  │   PLAY (-8.8 deg)    │                                              │
│  └──────────────────────┘                                              │
│  ┌──────────────────────┐                                              │
│  │   SHOP (-8.8 deg)    │                                              │
│  └──────────────────────┘                                              │
│        [33px Buffer Gap]                                               │
│  ┌──────────────────────┐                     (Customize Hitbox)       │
│  │  ACCOUNT (-8.8 deg)  │                    ┌──────────────────────┐  │
│  └──────────────────────┘                    │      CUSTOMIZE       │  │
│                                              └──────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. 16:9 Letterbox Container
- `#title-screen`: Flex container spanning $100\text{vw} \times 100\text{vh}$ with dark backdrop letterboxing.
- `#title-letterbox`: Constrained to `aspect-ratio: 16 / 9`, with `max-width: 100vw` and `max-height: 100vh`, guaranteeing that percentage coordinates map identically to the 1920×1080 pixel grid regardless of monitor resolution.

### 2. Calibrated Button Geometry
- **PLAY (`#titlePlayBtn`)**: `left: 25.47%`, `top: 57.87%`, `width: 20.10%`, `height: 10.93%`, `transform: rotate(-8.8deg)`. Centered at $(682\text{ px}, 684\text{ px})$.
- **SHOP (`#titleShopBtn`)**: `left: 27.76%`, `top: 70.28%`, `width: 20.10%`, `height: 10.93%`, `transform: rotate(-8.8deg)`. Centered at $(726\text{ px}, 818\text{ px})$.
- **ACCOUNT (`#titleAccountBtn`)**: `left: 29.43%`, `top: 84.07%`, `width: 20.10%`, `height: 10.93%`, `transform: rotate(-8.8deg)`. Centered at $(758\text{ px}, 967\text{ px})$.
- **SHOP / ACCOUNT Neutral Separation**: Distance between SHOP center ($y = 818\text{ px}$) and ACCOUNT center ($y = 967\text{ px}$) is $149\text{ px}$, creating a strict $33\text{ px}$ non-overlapping neutral boundary that prevents accidental misclicks.
- **CUSTOMIZE (`#titleCustomizeBtn`)**: `left: 78.33%`, `top: 88.80%`, `width: 19.06%`, `height: 7.31%`, `transform: none`. Starts at $y = 959\text{ px}$, strictly isolating the button body while excluding the decorative sticker capybaras.
- **CAPYBARA SELECTION (`#titleSelectionBtn`)**: `left: 81.56%`, `top: 12.50%`, `width: 17.24%`, `height: 6.48%`, `transform: none`. Starts at $y = 135\text{ px}$, strictly isolating the button body while excluding the rainbow text banner arch and peeking capybara illustration.

### 3. Display Modes & Regression Testing
- **Production Mode**: Transparent, borderless DOM elements (`background: transparent`, `border: none`, `outline: none`, `opacity: 0`). Zero visual lines or hover outlines appear in production.
- **Development Debug Mode**: Activated via `?debugHitboxes=1` query parameter or `window.toggleHitboxDebug()` in the console. Displays translucent lime-green overlay panels (`rgba(0, 255, 64, 0.45)`) and button labels for calibration.
- **Playwright Test Suite**: End-to-end regression harness in `tests/test_title_hitboxes.py` programmatically asserts all 5 buttons, tests boundary separation, and validates decorative element exclusion.

---

## 💾 Local Persistence & State

All player progression, all-time best distances, and the Top-3 Leaderboard are stored client-side in `localStorage`:
- `capybara_best_distance`: Stores floating-point distance record.
- `capybara_top3_leaderboard`: JSON array containing ranked pilot objects `[{ name, distance }]`.
- Persistence routines are wrapped in defensive `try/catch` handlers with deterministic fallbacks to gracefully support incognito or storage-restricted browser contexts.

---

## 🚪 Future Subsystem Architectural Contracts: CUSTOMIZE vs. SHOP

To preserve the tactile charm of the game and prevent drift into generic menu screens, strict architectural contracts govern the eventual implementation of **CUSTOMIZE** and **SHOP**:

### 1. CUSTOMIZE — Character & Equipment Outfitting Workbench
- **Mannequin-Centric Composition**: Features a prominent side-view capybara mannequin.
- **Directional Category Callouts**: Visual arrows originate from the capybara's anatomical regions pointing outward to category buttons:
  - `Hats`, `Hair`, `Shirts/Tops`, `Pants`, `Skirts`, `Shoes`, `Earrings`, `Necklaces`, `Rings`, and other accessories.
- **Secondary Preview Panels**: Clicking a category opens a focused popup to browse, preview directly on the mannequin, toggle owned state, confirm equipment, and return seamlessly to the workbench.
- **Equipment-Specific Spaces**: Customize is partitioned into equipment contexts:
  - **Capybara**: Wardrobe, facial cosmetics, and character passive perks.
  - **Jetpack**: Visual skins and equipment upgrades.
  - **Special Powers**: Initial power slot alongside mysterious, locked future slots reserved for endgame mastery.

### 2. SHOP — A Living Interactive Location
- **World as Location, Not Menu**: An illustrated whimsical shop environment featuring a capybara shopkeeper behind a counter with physical displays (hanging racks, shelves, jewelry cases). Clicking in-world displays triggers the existing popup purchase system.
- **Modular Shopkeeper Behavior Machine**: Non-blocking state machine driving animated behaviors:
  - *Autonomous*: `idle`, `lookAround`, `blink`, `sneeze`, `smile`, `eatOrange`, `duckUnderCounter`, `returnToCounter`.
  - *Impatience / Reaction*: `throwOrange`, `turnSign` ("BE BACK IN A COUPLE MINUTES"), and counter-bell ring response.
- **Ambient Environmental Life**: Subtle continuous motions (clothing racks swaying in the breeze, shelf dust, lighting shifts) independent of player inputs.
- **Dynamic Shopkeeper Challenges**:
  - Run-specific quests offered over the counter (e.g. "Retrieve my Lucky Orange" or "Find the Solid Gold Orange").
  - Dynamic run placement: Objectives spawn meaningfully downfield in procedural terrain rather than at launch.
  - Expandable challenge pool (potentially 100+ challenges) throttled to **at most 2 active challenges concurrently**.
- **Extensible Open-Book Foundation**: Space reserved for store minigames, secret interactions, seasonal events, and playful haggling without requiring core rewrites.

### 3. Data Architecture Rule: "Leave doors open; don't build rooms yet"
The foundational player profile in Feature 0.2 must support flexible schemas for equipped slots, inventory arrays, currency counts, and active challenge markers, while strictly avoiding premature code bloat or speculative systems.
