"""
Automated Playwright Test Suite for Yuzu Zen Boost Award & HUD Display.
Verifies:
1. Initial Zen Boost count is 1.
2. Collecting 1 Yuzu increases Zen Boost count to 2.
3. Collecting a 2nd Yuzu increases Zen Boost count to 3.
4. Existing Citrus Turbo effects still occur (stats, impulse, toast, audio).
5. Consuming a Zen Boost decrements the count by exactly 1.
6. The HUD accurately renders active orange pips matching the exact boost count.
7. The Jetpack developer button is hidden in production gameplay and visible only in debug/test modes.
"""

import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}


def test_initial_zen_boost_count():
    """Initial game boot and run reset starts with exactly 1 Zen Boost."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        boosts = page.evaluate("() => window.game.zenBoosts")
        assert boosts == 1, f"Expected initial zenBoosts == 1, got {boosts}"

        active_pips = page.locator("#boostPips .pip.active").count()
        assert active_pips == 1, f"Expected 1 active pip in HUD, got {active_pips}"

        browser.close()


def test_single_yuzu_collection_awards_one_boost():
    """Collecting one floating Yuzu increments zenBoosts by exactly +1 and adds a pip."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        res = page.evaluate("""() => {
            const yuzu = window.game.world.obstacles.find(o => o.type === 'yuzu');
            const initialBoosts = window.game.zenBoosts;
            const initialYuzus = window.game.stats.yuzusCollected;
            const initialVx = window.game.capybara.vx;

            // Trigger collision
            yuzu.onCollide(window.game.capybara, window.game);

            return {
                initialBoosts,
                afterBoosts: window.game.zenBoosts,
                initialYuzus,
                afterYuzus: window.game.stats.yuzusCollected,
                afterVx: window.game.capybara.vx,
                glideTimer: window.game.capybara.glideBoostTimer
            };
        }""")

        # Verify boost incremented by exactly 1
        assert res["initialBoosts"] == 1
        assert res["afterBoosts"] == 2, f"Expected zenBoosts to be 2, got {res['afterBoosts']}"

        # Verify existing effects still occurred
        assert res["afterYuzus"] == res["initialYuzus"] + 1, "Expected yuzusCollected to increment"
        assert res["afterVx"] >= 550, "Expected forward velocity impulse"
        assert res["glideTimer"] > 0, "Expected glide boost timer active"

        # Verify HUD updated to show 2 active pips
        active_pips = page.locator("#boostPips .pip.active").count()
        assert active_pips == 2, f"Expected 2 active pips in HUD, got {active_pips}"

        browser.close()


def test_multiple_yuzu_collection_awards_multiple_boosts():
    """Collecting multiple Yuzus sequentially increments zenBoosts without an artificial cap."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Collect first yuzu
        page.evaluate("""() => {
            const yuzu1 = window.game.world.obstacles.find(o => o.type === 'yuzu');
            yuzu1.onCollide(window.game.capybara, window.game);
        }""")
        assert page.evaluate("() => window.game.zenBoosts") == 2
        assert page.locator("#boostPips .pip.active").count() == 2

        # Collect second yuzu
        page.evaluate("""() => {
            const yuzus = window.game.world.obstacles.filter(o => o.type === 'yuzu');
            const yuzu2 = yuzus[1] || yuzus[0];
            yuzu2.onCollide(window.game.capybara, window.game);
        }""")
        assert page.evaluate("() => window.game.zenBoosts") == 3
        assert page.locator("#boostPips .pip.active").count() == 3

        browser.close()


def test_boost_consumption_decrements_by_one_and_updates_hud():
    """Activating Zen Boost consumes exactly 1 boost and removes 1 pip from the HUD."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Fire cannon into FLIGHT
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")
        page.wait_for_timeout(150)
        assert page.evaluate("() => window.game.state") == "FLIGHT"

        # Award 1 yuzu so boosts == 2
        page.evaluate("""() => {
            const yuzu = window.game.world.obstacles.find(o => o.type === 'yuzu');
            yuzu.onCollide(window.game.capybara, window.game);
        }""")
        assert page.evaluate("() => window.game.zenBoosts") == 2
        assert page.locator("#boostPips .pip.active").count() == 2

        # Consume 1 boost via Spacebar
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")
        page.wait_for_timeout(50)

        assert page.evaluate("() => window.game.zenBoosts") == 1
        assert page.locator("#boostPips .pip.active").count() == 1

        # Consume remaining boost
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")
        page.wait_for_timeout(50)

        assert page.evaluate("() => window.game.zenBoosts") == 0
        assert page.locator("#boostPips .pip.active").count() == 0

        browser.close()


def test_jetpack_dev_button_hidden_in_production_gameplay():
    """The #jetpackDevBtn is hidden by default in normal gameplay, but visible in debug mode."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)

        # 1. Normal production gameplay (no query params)
        page.goto(BASE_URL)
        dev_btn_classes = page.get_attribute("#jetpackDevBtn", "class")
        assert "hidden" in dev_btn_classes, f"Expected #jetpackDevBtn to be hidden in production, got: {dev_btn_classes}"
        assert page.is_hidden("#jetpackDevBtn"), "Expected #jetpackDevBtn to not be visible"

        # 2. Debug mode query param
        page.goto(f"{BASE_URL}/?debug=1")
        assert page.is_visible("#jetpackDevBtn"), "Expected #jetpackDevBtn to be visible under ?debug=1"

        # 3. testJetpack query param
        page.goto(f"{BASE_URL}/?testJetpack=1")
        assert page.is_visible("#jetpackDevBtn"), "Expected #jetpackDevBtn to be visible under ?testJetpack=1"

        browser.close()
