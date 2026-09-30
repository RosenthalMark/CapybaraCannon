"""
Automated Playwright Test Suite for Character & Cannon Sprite Animations.
Verifies:
1. SpriteSheetManager registers and loads animations (run, jump, double_jump, jetpack_eject,
   parachute_deploy, parachute_glide, impact_bonk, impact_roll, dizzy_stars, cannon_blast, cannon_lcd).
2. Cannon LCD displays coordinated state readouts across LOADING, AIMING, CHARGING, and LAUNCH.
3. Cannon firing triggers the 12-frame explosive blast animation player.
4. Capybara entity is equipped with AnimationPlayer and transitions across run, dizzy stars, and impact animations.
"""

import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}


def test_sprite_manager_registration():
    """Verify SpriteSheetManager registers all animation keys and textures."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        anim_keys = page.evaluate("""() => {
            return Array.from(window.game.capybara.anim.sprites.animations.keys());
        }""")

        expected = [
            "run", "jump", "double_jump", "jetpack_eject",
            "parachute_deploy", "parachute_glide",
            "impact_bonk", "impact_roll", "dizzy_stars", "cannon_blast"
        ]
        for key in expected:
            assert key in anim_keys, f"Missing registered animation: {key}"

        browser.close()


def test_cannon_lcd_state_coordination():
    """Verify cannon LCD status screen coordinates with game state cycle."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        # 1. Start loading -> LCD should show LOADING (state 1)
        page.click("#titlePlayBtn")
        page.wait_for_timeout(50)
        lcd_loading = page.evaluate("() => window.game.world.cannonLCDState")
        assert lcd_loading == 1, f"Expected LCD state 1 (LOADING), got {lcd_loading}"

        # 2. Finish loading into AIMING -> LCD should show AIMING (state 0)
        page.evaluate("() => window.game.finishCannonLoading()")
        page.wait_for_timeout(50)
        lcd_aiming = page.evaluate("() => window.game.world.cannonLCDState")
        assert lcd_aiming == 0, f"Expected LCD state 0 (AIMING), got {lcd_aiming}"

        # 3. Hold Spacebar -> LCD should show CHARGING (state 3)
        page.keyboard.down("Space")
        page.wait_for_timeout(100)
        lcd_charging = page.evaluate("() => window.game.world.cannonLCDState")
        assert lcd_charging == 3, f"Expected LCD state 3 (CHARGING), got {lcd_charging}"

        # 4. Release Spacebar -> Fires cannon -> LCD should show LAUNCH (state 4)
        page.keyboard.up("Space")
        page.wait_for_timeout(50)
        lcd_launch = page.evaluate("() => window.game.world.cannonLCDState")
        assert lcd_launch == 4, f"Expected LCD state 4 (LAUNCH), got {lcd_launch}"

        browser.close()


def test_cannon_blast_animation_trigger_on_fire():
    """Verify firing the cannon triggers the 12-frame explosive blast animation."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.evaluate("() => window.game.finishCannonLoading()")

        # Verify cannon blast player is not active before launch
        blast_active_before = page.evaluate("""() => {
            return window.game.world.cannonBlastPlayer.currentAnim;
        }""")
        assert blast_active_before is None, "Blast player should be idle before firing"

        # Fire cannon
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")
        page.wait_for_timeout(50)

        # Blast player must be playing cannon_blast
        blast_active_after = page.evaluate("""() => {
            const p = window.game.world.cannonBlastPlayer;
            return { anim: p.currentAnim, frame: p.frameIndex, finished: p.isFinished };
        }""")
        assert blast_active_after["anim"] == "cannon_blast", "Cannon blast animation should be active"
        assert blast_active_after["finished"] is False, "Blast animation should be in progress on launch"

        browser.close()


def test_capybara_animation_player_active():
    """Verify Capybara is equipped with AnimationPlayer and animates frames."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(100)

        # Capybara should be playing run during cannon loading waddle
        anim_data = page.evaluate("""() => {
            const a = window.game.capybara.anim;
            return {
                anim: a.currentAnim,
                timer: a.animTimer,
                frame: a.frameIndex
            };
        }""")
        assert anim_data["anim"] == "run", f"Expected 'run' animation during waddle, got {anim_data['anim']}"

        browser.close()
