# Capybara Cannon — Project Wishlist

This document serves as the formal repository for creative concepts, feature ideas, and long-term design possibilities for **Capybara Cannon**.

---

## 🧭 Project Documentation Architecture & Boundaries

To maintain engineering discipline and prevent scope creep, project documentation is strictly divided across four distinct roles:

* 💡 **`WISHLIST.md`**: Creative ideas, monetization concepts, experiments, and future possibilities. **Not approved work, not scheduled, and not committed.**
* 🗺️ **`ROADMAP.md`**: Formally approved, scheduled engineering milestones and active implementation phases.
* 📝 **`CHANGELOG.md`**: Historical record of actual implemented, tested, and locked code changes.
* 📋 **`DECISIONS.md`**: Formally accepted Architecture Decision Records (ADRs).

### Wishlist Rules & Status Tracking
1. **No Automatic Promotion**: Items in this document are **never** implemented or moved to `ROADMAP.md` without explicit user review and approval.
2. **Append-Only Intake**: Whenever the user requests *"Add this to the wishlist"*, the new entry is appended to the bottom of this document without reordering or removing previous items.
3. **Preservation of History**: When an item is later approved and scheduled or completed, its original text is preserved and marked with an updated status tag:
   - `[ ] WISHLIST`: Open concept under exploration / backlog.
   - `[~] PROMOTED TO ROADMAP`: Approved and scheduled (annotated with target Roadmap feature reference).
   - `[x] COMPLETED`: Implemented, tested, and locked in the codebase.
4. **No Premature Architecture**: Wishlist entries are design directions and design spaces; they do not dictate locked numeric values or require premature code infrastructure.

---

## 🎁 Wishlist Entries

### Item 001: Cappy Bear Club Seasonal Progression System

**Status:** `[ ] WISHLIST`  
**Working Naming Convention:** *Cappy Bear Club Season 1*, *Cappy Bear Club Season 2*, *Cappy Bear Club Season 3*, etc.

The Cappy Bear Club seasonal progression system is envisioned as an expansive long-term meta-layer operating on top of the core arcade launch game.

#### 1. Base Game Foundation & Commercial Model
* **Target Base Price:** **$2.99**
* **Inclusion:** The $2.99 base game contains the complete standalone game, full physics flight loops, local profile, and core progression systems.
* **Progression Pipeline:**
  $$\text{\$2.99 Base Game} \longrightarrow \text{Currency} \longrightarrow \text{Shop} \longrightarrow \text{Cosmetics} \longrightarrow \text{Challenges} \longrightarrow \text{Seasons} \longrightarrow \text{Free/Premium Tracks} \longrightarrow \text{Optional Purchases}$$
* **Strict Anti-Pay-to-Win Philosophy:**
  - **Zero gameplay/combat advantages for sale.** Paying players never possess stronger launches, higher maximum velocity, or unfair leaderboards.
  - Everything essential to game enjoyment and progression remains 100% earnable through gameplay, skill, challenges, and normal play.
  - Free players must have such an abundant volume of meaningful content to unlock that they never feel the game is withholding the fun.
  - Purchases are strictly restricted to: cosmetics, visual convenience, optional acceleration, seasonal track access, themed bundles, music, and collectible visual flairs.

#### 2. Seasonal Battle & Progression Track Structure
* Each Cappy Bear Club season features a tiered progression track:
  - **Standard Season Track (Free):** e.g., 50 levels filled with substantial earnable items, currency, and cosmetics.
  - **Premium Season Track:** e.g., 60 levels providing additional exclusive cosmetic content and bundles.
  - *(Level counts are provisional balancing concepts, subject to future tuning).*

#### 3. Example Premium Season Bundle
A seasonal pass bundle might offer:
* Full Premium Season Track access.
* **10 Level Skips** (usable individually on demand, never forced all at once).
* **500 Shop Currency** bonus.
* **One Exclusive Full Outfit** (a complete coordinated cosmetic set: hat, hair, shirt/top, pants/skirt, shoes, jewelry/accessories).

#### 4. Premium Exclusive Outfits
* High-tier complete outfits introduced alongside seasonal themes.
* One complete set packaged with the Premium Season Pass; additional standalone cosmetic sets potentially offered for direct purchase (e.g. $0.99 each as a pricing candidate).
* Strictly cosmetic; zero stat or flight bonuses.

#### 5. Season Reward Variety
Seasonal rewards may include:
* Full outfits, individual clothing items (hats, shirts, pants, skirts, shoes, jewelry, glasses, rings).
* **Trail Effects** (custom visual particle ribbons trailing the capybara).
* Custom music tracks and sound themes.
* In-game currency drops.
* Exclusive stickers, badges, and seasonal flairs.
* Distribution channels: Free track, premium track, seasonal challenges, and seasonal shop rotation.

#### 6. Seasonal Design Philosophy: Discovery over Pressure
* **No Artificial Urgency or FOMO:** The season should feel like an exciting toybox of discoveries rather than a stress-inducing pressure system.
* Players should want to play because there is a ridiculous amount of fun stuff to unlock, not because the game threatens to take things away.
* Normal gameplay must never be made intentionally tedious or punishing to pressure players into spending.

#### 7. Optional Convenience Item: Head Starts
* **Concept:** Consumable item selected prior to cannon launch.
* **Example Behavior:**
  - Catapults the player $\approx 1,500\text{ m}$ directly into the run.
  - Automatically equips a starting Jetpack.
  - Provides $\approx 2\times$ normal Jetpack fuel for that starting Jetpack.
* **Packaging Candidate:** e.g., bundle of 20 Head Start uses for $0.99.
* **Constraint:** Strictly optional convenience. Distance records and leaderboards must handle Head Starts fairly, and normal runs must remain completely satisfying without them. All distances and multipliers remain TBD.

#### 8. In-Game Shop Currency
* In-game currency earnable via normal flight runs, milestones, seasonal challenges, and achievements.
* Optionally purchasable in bundles for players wishing to accelerate cosmetic collection.
* Currency naming, balance curves, and price points remain TBD.

#### 9. Rotating Shop Content
* Whimsical shop storefront featuring periodic rotations of cosmetics, outfits, trails, and audio tracks.
* Balanced carefully so shop-exclusive items never eclipse the massive pool of earnable gameplay rewards.
* Designed for delight and discovery without aggressive countdown timers.

#### 10. Dedicated Customization Category: Trails
* **Trail System:** Visual emission ribbons drawn behind the capybara during movement, dynamically scaling in intensity across the hybrid run states:
  - **Cannon Launch:** Maximum intensity and length; huge dramatic emission trail across the sky.
  - **Jetpack Flight:** Medium intensity; clearly visible energetic emission matching thruster burn.
  - **Ground Running:** Subtle, low-profile ground trail following the runner's path.
* **Visual Variants Pool:** Sparkles, gold stars, autumn leaves, water bubbles, citrus drops, comic flames, rainbow glitter, glowing celestial dust, seasonal snowflakes.
* Integrated into the **Customize Screen** as a first-class equipment socket. Designed modularly so new trail emitters can be added with zero engine changes.

#### 11. Customization System Integration
* The seasonal reward engine must interface cleanly with the future Customize workbench contexts:
  - Capybara Wardrobe (Hats, Hair, Tops, Bottoms, Shoes, Jewelry, Accessories).
  - Trails (Equippable emission styles).
  - Jetpack (Skins and visual chassis variants).
  - Audio (Unlockable in-flight music streams).

#### 12. Modular Seasonal Framework
* Each season follows a clean, repeatable structure:
  $$\text{Season Theme} \longrightarrow \text{Track Progression} \longrightarrow \text{Seasonal Challenges} \longrightarrow \text{Cosmetics \& Trails} \longrightarrow \text{Grand Final Reward}$$
* Engineered so new seasons are defined purely through declarative data without rewriting the underlying game loop or progression engine.
* **Grand Final Reward:** An ultra-desirable, prestigious cosmetic (e.g. mythic outfit or legendary trail effect) capping off track completion. Non-P2W.

---
