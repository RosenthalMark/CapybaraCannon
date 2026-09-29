"""
Automated Playwright Test Suite for Cannon Loading Animation and Decorative Orange Removal.
Verifies:
1. Clicking PLAY enters CANNON_LOADING state.
2. Loading does not immediately enter AIMING.
3. Loading progresses through its distinct phases (ENTER -> CLIMB -> BARREL_ENTRY -> BARREL_PAUSE -> HEAD_POP -> READY).
4. Loading eventually reaches AIMING state automatically.
5. AIMING still accepts normal input after loading.
6. Charging still works after loading completes.
7. Launch still works after loading completes.
8. Fast-forwarding via Space/click during CANNON_LOADING safely transitions into CHARGING/AIMING.
9. Decorative orange/Yuzu is removed from Capybara's head presentation.
10. Floating gameplay Yuzus still exist, grant Citrus Turbo, and award Zen Boosts.
"""

import math
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}


def test_play_enters_cannon_loading_and_not_immediately_aiming():
    """Clicking PLAY enters CANNON_LOADING with ENTER phase, not immediately AIMING."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(50)

        state = page.evaluate("() => window.game.state")
        phase = page.evaluate("() => window.game.loadingPhase")

        assert state == "CANNON_LOADING", f"Expected CANNON_LOADING state immediately after PLAY, got {state}"
        assert phase == "ENTER", f"Expected ENTER phase at start of loading, got {phase}"

        # Ensure power charging is not active during loading
        power = page.evaluate("() => window.game.power")
        assert power == 0, f"Expected power 0 during CANNON_LOADING, got {power}"

        browser.close()


def test_loading_progresses_through_phases_to_aiming():
    """Loading automatically cycles through phases and settles into AIMING."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")

        # After 1.2s, ENTER (1.1s) should have completed, transitioning to CLIMB or beyond
        page.wait_for_timeout(1250)
        phase_mid = page.evaluate("() => window.game.loadingPhase")
        assert phase_mid in ["CLIMB", "BARREL_ENTRY", "BARREL_PAUSE"], (
            f"Expected loading to progress beyond ENTER after 1.25s, got {phase_mid}"
        )

        # Wait for full sequence to finish (~3.5s total)
        for _ in range(40):
            page.wait_for_timeout(100)
            if page.evaluate("() => window.game.state") == "AIMING":
                break

        state_final = page.evaluate("() => window.game.state")
        phase_final = page.evaluate("() => window.game.loadingPhase")

        assert state_final == "AIMING", f"Expected state to reach AIMING, got {state_final}"
        assert phase_final == "READY", f"Expected loading phase READY, got {phase_final}"

        # Ensure launch controls are now visible
        launch_hidden = page.evaluate("() => document.getElementById('launch-controls').classList.contains('hidden')")
        assert launch_hidden is False, "Expected launch controls to be shown once AIMING is reached"

        browser.close()


def test_aiming_accepts_normal_input_after_loading():
    """Once in AIMING, keyboard and mouse aiming control cannonAngle within [10 deg, 60 deg]."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")

        # Wait until AIMING
        for _ in range(40):
            page.wait_for_timeout(100)
            if page.evaluate("() => window.game.state") == "AIMING":
                break

        assert page.evaluate("() => window.game.state") == "AIMING"

        # Press ArrowUp
        angle_before = page.evaluate("() => window.game.world.cannonAngle")
        page.keyboard.down("ArrowUp")
        page.wait_for_timeout(300)
        page.keyboard.up("ArrowUp")
        angle_after_up = page.evaluate("() => window.game.world.cannonAngle")

        assert angle_after_up > angle_before, "Expected ArrowUp to increase cannon angle"
        assert angle_after_up <= (60 * math.pi / 180) + 1e-4, "Angle must not exceed 60 deg"

        # Press ArrowDown
        page.keyboard.down("ArrowDown")
        page.wait_for_timeout(800)
        page.keyboard.up("ArrowDown")
        angle_after_down = page.evaluate("() => window.game.world.cannonAngle")

        assert angle_after_down < angle_after_up, "Expected ArrowDown to decrease cannon angle"
        assert angle_after_down >= (10 * math.pi / 180) - 1e-4, "Angle must not go below 10 deg"

        browser.close()


def test_charging_and_launch_work_after_loading():
    """Holding Space charges the cannon, releasing fires into FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")

        # Wait until AIMING
        for _ in range(40):
            page.wait_for_timeout(100)
            if page.evaluate("() => window.game.state") == "AIMING":
                break

        # Charge cannon
        page.keyboard.down("Space")
        page.wait_for_timeout(200)

        state_charging = page.evaluate("() => window.game.state")
        power = page.evaluate("() => window.game.power")
        assert state_charging == "CHARGING", f"Expected CHARGING, got {state_charging}"
        assert power > 0, f"Expected power > 0, got {power}"

        # Release and fire
        page.keyboard.up("Space")
        page.wait_for_timeout(100)

        state_flight = page.evaluate("() => window.game.state")
        vx = page.evaluate("() => window.game.capybara.vx")
        assert state_flight == "FLIGHT", f"Expected FLIGHT after launch, got {state_flight}"
        assert vx > 100, f"Expected positive horizontal forward velocity, got {vx}"

        browser.close()


def test_space_fast_forward_during_loading():
    """Pressing Space during CANNON_LOADING fast-forwards into CHARGING immediately."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)
        assert page.evaluate("() => window.game.state") == "CANNON_LOADING"

        # Press Space while loading
        page.keyboard.down("Space")
        page.wait_for_timeout(100)

        state = page.evaluate("() => window.game.state")
        assert state == "CHARGING", f"Expected immediate transition to CHARGING on Space down, got {state}"

        # Release to launch
        page.keyboard.up("Space")
        page.wait_for_timeout(100)
        assert page.evaluate("() => window.game.state") == "FLIGHT"

        browser.close()


def test_decorative_yuzu_removed_from_head():
    """Verify that Capybara drawHead does not draw a decorative orange on the head."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)

        # Inspect Capybara class draw methods in runtime
        has_draw_head = page.evaluate("() => typeof window.game.capybara.drawHead === 'function'")
        assert has_draw_head is True, "Expected drawHead method on Capybara"

        # Check source of drawCapybaraBody does not invoke drawYuzuOnHead
        draw_body_source = page.evaluate("() => window.game.capybara.drawCapybaraBody.toString()")
        assert "drawYuzuOnHead" not in draw_body_source, (
            "Found active call to drawYuzuOnHead in drawCapybaraBody"
        )

        browser.close()


def test_gameplay_yuzus_still_exist_and_collect_correctly():
    """Gameplay Yuzus (floating oranges) still award Citrus Turbo and increment Zen Boosts."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")

        # Fast-forward to flight
        page.keyboard.down("Space")
        page.wait_for_timeout(100)
        page.keyboard.up("Space")
        page.wait_for_timeout(100)

        # Simulate Yuzu collection via obstacle collision hook
        result = page.evaluate("""() => {
            const initialBoosts = window.game.zenBoosts;
            const yuzu = window.game.world.obstacles.find(o => o.constructor.name === 'Yuzu');
            if (!yuzu) {
                // Instantiate one if not currently in view
                const groundY = window.game.world.getGroundY(window.game.capybara.x);
                const testYuzu = new (window.game.world.obstacles[0].constructor.name === 'Yuzu'
                    ? window.game.world.obstacles[0].constructor
                    : Object.getPrototypeOf(window.game.world.obstacles.find(o => o.onCollide)).constructor)(window.game.capybara.x, groundY - 50);
            }
            // Trigger onCollide directly
            const yuzuObs = window.game.world.obstacles.find(o => o.constructor.name === 'Yuzu');
            if (yuzuObs) {
                yuzuObs.onCollide(window.game.capybara, window.game);
                return {
                    boostsBefore: initialBoosts,
                    boostsAfter: window.game.zenBoosts,
                    yuzusCollected: window.game.stats.yuzusCollected,
                    glideTimer: window.game.capybara.glideBoostTimer
                };
            }
            return null;
        }""")

        assert result is not None, "Failed to locate Yuzu obstacle for test"
        assert result["boostsAfter"] == result["boostsBefore"] + 1, "Expected Yuzu to grant +1 Zen Boost"
        assert result["yuzusCollected"] >= 1, "Expected yuzusCollected stat to increment"
        assert result["glideTimer"] > 0, "Expected Citrus Turbo glide boost timer to be set"

        browser.close()
