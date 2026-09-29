"""
Automated Playwright Test Suite for Stage 2: First Playable Jetpack Movement.
Verifies:
1. Entering JETPACK_FLIGHT via KeyJ, #jetpackDevBtn, and URL ?jetpack=1.
2. Unified onActionDown() activates thrust (isThrusting == True).
3. Unified onActionUp() deactivates thrust (isThrusting == False).
4. Holding thrust produces upward acceleration (vy decreases).
5. Releasing thrust stops upward acceleration and resumes downward gravity acceleration.
6. Horizontal velocity (vx) is preserved and not zeroed or destroyed.
7. Mobile touch holds thrust on touchstart and stops on touchend.
8. Backward compatibility: normal launch without Jetpack remains in FLIGHT state.
"""

import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}
VIEWPORT_MOBILE = {"width": 390, "height": 844, "is_mobile": True, "has_touch": True}


def launch_into_flight(page):
    """Helper to start game and fire cannon into flight."""
    page.wait_for_selector("#titleScreen:not(.hidden)")
    page.click("#titlePlayBtn")
    page.wait_for_timeout(200)

    # Charge and fire
    page.keyboard.down("Space")
    page.wait_for_timeout(120)
    page.keyboard.up("Space")
    page.wait_for_timeout(150)


def test_jetpack_entry_via_key_j():
    """Pressing 'J' while airborne transitions state to JETPACK_FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)

        launch_into_flight(page)

        state_before = page.evaluate("() => window.game.state")
        assert state_before == "FLIGHT", f"Expected FLIGHT before J press, got {state_before}"

        # Press J key
        page.keyboard.press("KeyJ")
        page.wait_for_timeout(100)

        state_after = page.evaluate("() => window.game.state")
        has_jetpack = page.evaluate("() => window.game.capybara.hasJetpack")

        assert state_after == "JETPACK_FLIGHT", f"Expected JETPACK_FLIGHT, got {state_after}"
        assert has_jetpack is True, "Expected capybara.hasJetpack to be True"

        browser.close()


def test_jetpack_entry_via_dev_button():
    """Clicking #jetpackDevBtn while airborne transitions to JETPACK_FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)

        launch_into_flight(page)

        # Click the HUD jetpack dev button
        page.click("#jetpackDevBtn")
        page.wait_for_timeout(100)

        state = page.evaluate("() => window.game.state")
        has_jetpack = page.evaluate("() => window.game.capybara.hasJetpack")

        assert state == "JETPACK_FLIGHT", f"Expected JETPACK_FLIGHT, got {state}"
        assert has_jetpack is True, "Expected capybara.hasJetpack to be True"

        browser.close()


def test_jetpack_auto_equip_via_url_param():
    """Loading with ?jetpack=1 equips jetpack so firing enters JETPACK_FLIGHT directly."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?jetpack=1")

        launch_into_flight(page)

        state = page.evaluate("() => window.game.state")
        has_jetpack = page.evaluate("() => window.game.capybara.hasJetpack")

        assert state == "JETPACK_FLIGHT", f"Expected JETPACK_FLIGHT, got {state}"
        assert has_jetpack is True, "Expected capybara.hasJetpack to be True"

        browser.close()


def test_jetpack_thrust_action_down_and_up():
    """Space down activates isThrusting; Space up deactivates isThrusting in JETPACK_FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?jetpack=1")

        launch_into_flight(page)
        assert page.evaluate("() => window.game.state") == "JETPACK_FLIGHT"

        # Initially not thrusting
        assert page.evaluate("() => window.game.capybara.isThrusting") is False

        # Press and hold Spacebar
        page.keyboard.down("Space")
        page.wait_for_timeout(50)
        assert page.evaluate("() => window.game.capybara.isThrusting") is True, "Expected isThrusting True on Space down"

        # Release Spacebar
        page.keyboard.up("Space")
        page.wait_for_timeout(50)
        assert page.evaluate("() => window.game.capybara.isThrusting") is False, "Expected isThrusting False on Space up"

        browser.close()


def test_jetpack_thrust_produces_upward_acceleration_and_gravity_resumes():
    """Holding thrust produces upward acceleration (vy decreases); releasing resumes gravity."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?jetpack=1")

        launch_into_flight(page)
        assert page.evaluate("() => window.game.state") == "JETPACK_FLIGHT"

        # Allow ballistic arc to reach downward falling (vy > 0)
        page.wait_for_timeout(1000)
        vy_before_thrust = page.evaluate("() => window.game.capybara.vy")

        # Engage thrust for 300ms
        page.keyboard.down("Space")
        page.wait_for_timeout(300)
        vy_after_thrust = page.evaluate("() => window.game.capybara.vy")

        # Because jetpack thrust exceeds gravity (1600 > 680), net vertical acceleration is upward (negative Y)
        # Therefore, vy_after_thrust should be less than vy_before_thrust (or negative)
        assert vy_after_thrust < vy_before_thrust, (
            f"Expected vy to decrease during thrust: before={vy_before_thrust}, after={vy_after_thrust}"
        )

        # Release thrust and observe gravity taking over
        page.keyboard.up("Space")
        page.wait_for_timeout(350)
        vy_after_release = page.evaluate("() => window.game.capybara.vy")

        # With thrust off, gravity pulls downward, so vy increases
        assert vy_after_release > vy_after_thrust, (
            f"Expected vy to increase after release under gravity: thrust={vy_after_thrust}, release={vy_after_release}"
        )

        browser.close()


def test_jetpack_preserves_horizontal_momentum():
    """Thrusting does not reset, zero, or corrupt horizontal velocity (vx)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?jetpack=1")

        launch_into_flight(page)
        assert page.evaluate("() => window.game.state") == "JETPACK_FLIGHT"

        vx_initial = page.evaluate("() => window.game.capybara.vx")
        assert vx_initial > 100, f"Expected strong initial vx, got {vx_initial}"

        # Hold thrust for 250ms
        page.keyboard.down("Space")
        page.wait_for_timeout(250)

        vx_during = page.evaluate("() => window.game.capybara.vx")
        assert vx_during > 80, f"Horizontal momentum vx should remain strong during thrust, got {vx_during}"
        assert abs(vx_during - vx_initial) < 150, "vx should only be subject to gentle aerodynamic drag"

        page.keyboard.up("Space")
        browser.close()


def test_mobile_touch_controls_jetpack_thrust():
    """Touch on canvas activates thrust and touchend deactivates thrust."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_MOBILE)
        page.goto(f"{BASE_URL}/?jetpack=1")

        launch_into_flight(page)
        assert page.evaluate("() => window.game.state") == "JETPACK_FLIGHT"

        # Touchstart on canvas
        page.evaluate("""() => {
            const canvas = document.getElementById('gameCanvas');
            canvas.dispatchEvent(new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true
            }));
        }""")
        page.wait_for_timeout(50)
        assert page.evaluate("() => window.game.capybara.isThrusting") is True, "Expected isThrusting True on touchstart"

        # Touchend on window
        page.evaluate("""() => {
            window.dispatchEvent(new TouchEvent('touchend', {
                bubbles: true,
                cancelable: true
            }));
        }""")
        page.wait_for_timeout(50)
        assert page.evaluate("() => window.game.capybara.isThrusting") is False, "Expected isThrusting False on touchend"

        browser.close()
