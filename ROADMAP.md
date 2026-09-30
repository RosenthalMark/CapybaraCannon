# Capybara Cannon — Public Engineering Roadmap

This roadmap documents the architectural milestones, core gameplay systems, and experimental backlog for **Capybara Cannon**.

---

## 🎯 Development Principles

1. **One Feature at a Time**: Each milestone is implemented, thoroughly verified across physics and UI, and reviewed before initiating subsequent tasks.
2. **Visual Fidelity**: Core artwork and illustrated interfaces are integrated with pixel-level fidelity without synthetic redesigns.
3. **Data-First Architecture**: Foundations like player state, roster structures, and persistence precede cosmetic and shop implementations.

---

## 🗺️ Implementation Phases

### Phase 0: Foundations & Architecture

- [x] **Feature 0.1 — Title Screen & Five Doors Scaffolding**  
  *Status: COMPLETED & LOCKED (v0.1.0 — Verified 8/8 Tests Passed & Manually Approved)*  
  Native 1080p master artwork overlay (`assets/art/title-screen-1080p.png`), precision-angled hitboxes (`-8.8°` tilt on PLAY, SHOP, ACCOUNT), safe 33px neutral buffer separating SHOP and ACCOUNT, decorative art exclusion (isolating CUSTOMIZE from sticker capybaras and SELECTION from rainbow arch/peeking capybara), invisible production hitboxes with optional development debug visualizer (`?debugHitboxes=1`), looping title theme audio (`assets/audio/title-theme.m4a`), destination modal scaffolding for Shop, Account, Customize, and Selection, and automated Playwright regression test suite (`tests/test_title_hitboxes.py`).
- [ ] **Feature 0.2 — Roster Data Structure & Active Capybara State**  
  *Status: NEXT UP*  
  Centralized player profile model, active capybara data schema (stats: weight, bounce, drag, air-control), schema-safe `localStorage` synchronization.
- [ ] **Feature 0.3 — Capybara Selection Screen Implementation**  
  Roster preview UI, capybara selection persistence, switching active flight capybara.
- [ ] **Feature 0.4 — Account & Profile Screen Implementation**  
  Career statistics dashboard, milestone badges, lifetime distance, flight count.
- [ ] **Feature 0.5 — Currency & In-Flight Collectibles**  
  Thematic currency spawning (Citrus Seeds), pickup collision detection, wallet persistence.

---

### Phase 1: Core Physics & Launch Juice

- [ ] **Feature 1.1 — Cannon Barrel Loading & Squash Animation**  
  Visual capybara loading sequence inside cannon barrel prior to charge.
- [ ] **Feature 1.2 — Aerodynamic Flight Dynamics & Wind Resistance**  
  Angle-dependent lift and drag coefficients, supersonic vapor cone visual effects.
- [ ] **Feature 1.3 — Dynamic Camera Lead & Velocity Zoom**  
  Anticipatory camera offsets scaling with projectile momentum.
- [ ] **Feature 1.4 — Sound Design Layering**  
  Procedural wind rush synthesizers, Doppler effect on obstacle fly-bys.

---

### Phase 2: Customization & Progression Systems

- [ ] **Feature 2.1 — Wardrobe & Cosmetic Data Schema**  
  Full 9-socket modular cosmetic schema with zero-stat cosmetic purity:
  - **7 Character Slots:** Hats/Headwear, Hair/Wigs, Eyewear/Face, Tops/Shirts, Bottoms (Pants/Skirts/Shorts), Footwear/Shoes, Neck & Accessories.
  - **2 Universal FX / Vehicle Slots:** Trails (dynamic emission ribbons scaling across cannon launch, flight, and runner), Parachutes (canopy skins deployed on descent).
- [ ] **Feature 2.2 — Customize Screen Workbench & Jetpack Workshop**  
  Interactive dual-context workbench with 2560×1080 ultrawide mobile canvas (1920×1080 central safe zone):
  - **Capybara Mannequin Context:** Rotatable character preview with directional socket callouts, item preview popups, and real-time clothing layering.
  - **Dedicated Jetpack Workshop Context:** 4-socket modular jetpack customization:
    1. *Chassis / Body Skin:* Twin Chrome, Fizzy Pop Cans, Cyber Battery Pack, Hinoki Keg, Firework Bundle.
    2. *Thruster Flame & Plume FX:* Classic Fire, Rainbow Neon Laser, Soda Bubble Spray, Hot Spring Steam, Party Confetti.
    3. *Nozzle Hardware:* Dual Chrome Cones, Square Cyber Vents, Bamboo Shoots, Golden Dragon Mouths.
    4. *Thruster Audio FX:* Deep Rocket Roar, 8-Bit Synth Buzz, Fizzy Soda Hiss, Steam Whistle.
- [ ] **Feature 2.3 — Living Capybara Shop Location**  
  Illustrated store environment with modular animated shopkeeper behind the counter, interactive merchandise displays (racks/shelves) triggering purchase popups, counter bell call-backs, and persistent currency display.
- [ ] **Feature 2.4 — Shopkeeper Challenges System**  
  In-flight run quests issued over the counter (e.g. Solid Gold Orange, lost lucky orange, distance tasks), dynamic in-flight object placement, and 2-active-challenge concurrency throttle.
- [ ] **Feature 2.5 — Secret Outfit Combos**  
  Easter-egg accessory pairings granting unique passive bonuses.

---

### Phase 3: Biomes & Dynamic Worlds

- [ ] **Feature 3.1 — Multi-Biome Procedural Generation**  
  Seamless transitions: Wetland Jungle → Enchanted Hot Springs → Cosmic Stratosphere.
- [ ] **Feature 3.2 — Biome Environmental Hazards**  
  Geysers, low-gravity celestial fields, wind currents.

---

## 🧪 Experimental / Ideas Pool

Ideas in this pool are actively explored and prototyped, evaluated for arcade fun, and promoted to committed roadmap milestones upon approval:

- **Interactive Obstacles**: TNT Barrels, Mushroom Trampolines, Citrus Turbos, Pelican Bird Lifts, Mud Quagmires.
- **Flight Mechanics**: Thruster Jetpack power-up, Second-Chance Relaunch timer, Bubble Shields.
- **Shopkeeper Interactions & Minigames**: Shopkeeper impatience reactions (orange throwing, "BE BACK" sign), store counter bell, store minigames, secret interactive shop items, seasonal events, quirky haggling dialogues.
- **Social & Meta**: Local QR-code peer score sharing, Quirky stats achievements (Citrus Consumed, Mud Baths Taken).
- **Secondary Modes**: Standalone side-scrolling runner prototype (strictly isolated from cannon launch physics).
