"""
Automated Playwright Test Suite for Stage 1: Input Event Abstraction.
Verifies unified onActionDown() and onActionUp() dispatch across Desktop Spacebar,
Launch Button Mouse, and Launch Button Touch, asserting state transitions,
power meter oscillation, OS key-repeat deduplication, and flight action routing.
"""

import os
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}
VIEWPORT_MOBILE = {"width": 390, "height": 844, "is_mobile": True, "has_touch": True}


def test_desktop_spacebar_charge_and_launch():
    """Desktop Spacebar keydown charges the cannon; keyup fires into FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        # Start game from title screen
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Confirm initial state is AIMING
        state = page.evaluate("() => window.game.state")
        assert state == "AIMING", f"Expected AIMING, got {state}"

        # Press and hold Spacebar
        page.keyboard.down("Space")
        page.wait_for_timeout(150)

        # Verify state transitioned to CHARGING and power is oscillating
        state_charging = page.evaluate("() => window.game.state")
        power = page.evaluate("() => window.game.power")
        assert state_charging == "CHARGING", f"Expected CHARGING, got {state_charging}"
        assert power > 0.08, f"Expected power to increase above minPower (0.08), got {power}"

        # Release Spacebar to fire
        page.keyboard.up("Space")
        page.wait_for_timeout(100)

        # Verify state is FLIGHT and velocity is non-zero
        state_flight = page.evaluate("() => window.game.state")
        vx = page.evaluate("() => window.game.capybara.vx")
        assert state_flight == "FLIGHT", f"Expected FLIGHT, got {state_flight}"
        assert vx > 100, f"Expected forward velocity vx > 100, got {vx}"

        browser.close()


def test_mouse_launch_button_charge_and_launch():
    """Mouse mousedown on #launch-btn charges; window mouseup fires into FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        state = page.evaluate("() => window.game.state")
        assert state == "AIMING", f"Expected AIMING, got {state}"

        # Mouse down on #launchBtn
        launch_btn = page.locator("#launchBtn")
        launch_btn.dispatch_event("mousedown")
        page.wait_for_timeout(150)

        state_charging = page.evaluate("() => window.game.state")
        power = page.evaluate("() => window.game.power")
        assert state_charging == "CHARGING", f"Expected CHARGING, got {state_charging}"
        assert power > 0.08, f"Expected power > 0.08, got {power}"

        # Mouse up on window
        page.evaluate("() => window.dispatchEvent(new MouseEvent('mouseup'))")
        page.wait_for_timeout(100)

        state_flight = page.evaluate("() => window.game.state")
        vx = page.evaluate("() => window.game.capybara.vx")
        assert state_flight == "FLIGHT", f"Expected FLIGHT, got {state_flight}"
        assert vx > 100, f"Expected forward velocity vx > 100, got {vx}"

        browser.close()


def test_touch_launch_button_charge_and_launch():
    """Touch touchstart on #launchBtn charges; window touchend fires into FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_MOBILE)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        state = page.evaluate("() => window.game.state")
        assert state == "AIMING", f"Expected AIMING, got {state}"

        # Touchstart on #launchBtn
        page.evaluate("""() => {
            const btn = document.getElementById('launchBtn');
            btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
        }""")
        page.wait_for_timeout(150)

        state_charging = page.evaluate("() => window.game.state")
        power = page.evaluate("() => window.game.power")
        assert state_charging == "CHARGING", f"Expected CHARGING, got {state_charging}"
        assert power > 0.08, f"Expected power > 0.08, got {power}"

        # Touchend on window
        page.evaluate("""() => {
            window.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
        }""")
        page.wait_for_timeout(100)

        state_flight = page.evaluate("() => window.game.state")
        vx = page.evaluate("() => window.game.capybara.vx")
        assert state_flight == "FLIGHT", f"Expected FLIGHT, got {state_flight}"
        assert vx > 100, f"Expected forward velocity vx > 100, got {vx}"

        browser.close()


def test_spacebar_key_repeat_deduplication():
    """Holding Spacebar sends multiple keydown events; deduplication guard prevents power reset."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Initial press
        page.keyboard.down("Space")
        page.wait_for_timeout(100)
        power_1 = page.evaluate("() => window.game.power")

        # Simulate 4 rapid OS key-repeat events
        for _ in range(4):
            page.evaluate("""() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
            }""")
            page.wait_for_timeout(30)

        power_2 = page.evaluate("() => window.game.power")
        state = page.evaluate("() => window.game.state")

        # Must still be charging, and power must not have reset to minPower
        assert state == "CHARGING", f"Expected CHARGING, got {state}"
        assert power_2 >= power_1, f"Expected power to advance (power_2: {power_2} >= power_1: {power_1})"

        # Release to fire
        page.keyboard.up("Space")
        page.wait_for_timeout(100)
        assert page.evaluate("() => window.game.state") == "FLIGHT"

        browser.close()


def test_in_flight_action_routing():
    """In FLIGHT state, onActionDown() routes directly to triggerZenBoost() without state corruption."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Fire cannon into flight
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")
        page.wait_for_timeout(150)

        state = page.evaluate("() => window.game.state")
        assert state == "FLIGHT", f"Expected FLIGHT, got {state}"

        boosts_before = page.evaluate("() => window.game.zenBoosts")
        assert boosts_before == 1, f"Expected 1 starting Zen Boost, got {boosts_before}"

        # Action down in flight via Spacebar
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        page.keyboard.up("Space")

        boosts_after = page.evaluate("() => window.game.zenBoosts")
        assert boosts_after == 0, f"Expected Zen Boost consumed (0), got {boosts_after}"
        assert page.evaluate("() => window.game.state") == "FLIGHT"

        browser.close()


def test_title_screen_input_isolation():
    """Pressing Spacebar in TITLE state does not prematurely start charging or enter FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        assert page.evaluate("() => window.game.state") == "TITLE"

        # Press Spacebar while in title screen
        page.keyboard.down("Space")
        page.wait_for_timeout(100)
        page.keyboard.up("Space")
        page.wait_for_timeout(100)

        # Game must remain in TITLE
        assert page.evaluate("() => window.game.state") == "TITLE"
        title_classes = page.get_attribute("#titleScreen", "class")
        assert "hidden" not in (title_classes or ""), "Title screen must remain visible"

        browser.close()
