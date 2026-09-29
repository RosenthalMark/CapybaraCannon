"""
Automated Playwright Test Suite for Jetpack Flight Envelope & Cannon Angle Limits.
Verifies:
1. Jetpack rises normally below the soft envelope.
2. Thrust progressively attenuates in the soft envelope (400px - 520px).
3. Player cannot escape the maximum playable altitude (520px).
4. Player does not remain permanently frozen at the upper boundary.
5. Releasing thrust near the upper boundary produces natural falling.
6. Falling away from the boundary restores stronger thrust.
7. Cannon mouse/touch aiming cannot exceed 60 degrees.
8. Cannon keyboard aiming cannot exceed 60 degrees.
9. Cannon cannot go below 10 degrees.
10. Maximum cannon angle still produces meaningful forward velocity (>= 48% speed).
"""

import math
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}


def launch_game(page, url=BASE_URL, charge_ms=120):
    """Helper to start game and fire cannon into flight."""
    page.goto(url)
    page.wait_for_selector("#titleScreen:not(.hidden)")
    page.click("#titlePlayBtn")
    page.wait_for_timeout(200)

    # Charge and fire
    page.keyboard.down("Space")
    page.wait_for_timeout(charge_ms)
    page.keyboard.up("Space")
    page.wait_for_timeout(150)


def get_altitude(page):
    """Returns current ground-relative altitude in pixels."""
    return page.evaluate(
        "() => window.game.world.getGroundY(window.game.capybara.x) - window.game.capybara.y"
    )


def test_jetpack_rises_normally_below_soft_envelope():
    """Below 400px altitude, thrust produces full upward acceleration (~ -920 px/s^2)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1")

        # Wait for natural ballistic arc to reach falling state below 350px altitude
        page.wait_for_timeout(1000)
        alt = get_altitude(page)
        assert alt < 400, f"Expected altitude < 400px, got {alt}"

        vy_before = page.evaluate("() => window.game.capybara.vy")

        # Engage thrust for 250ms
        page.keyboard.down("Space")
        page.wait_for_timeout(250)
        vy_after = page.evaluate("() => window.game.capybara.vy")
        page.keyboard.up("Space")

        # In normal zone, net accel is ~ -920 px/s^2, so vy must decrease significantly
        diff = vy_after - vy_before
        assert diff < -100, f"Expected vy to decrease by > 100 px/s below envelope, got diff={diff}"

        browser.close()


def test_thrust_progressively_attenuates_in_soft_envelope():
    """In the soft buffer zone (400-520px), upward acceleration softens."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1", charge_ms=250)

        # Climb into the soft zone (above 400px)
        page.keyboard.down("Space")
        # Poll until altitude reaches soft zone
        for _ in range(30):
            page.wait_for_timeout(100)
            alt = get_altitude(page)
            if alt >= 420:
                break

        alt_in_zone = get_altitude(page)
        assert alt_in_zone >= 400, f"Expected altitude >= 400px in soft zone, got {alt_in_zone}"

        # Sample vy rate of change in the soft zone over 150ms
        vy1 = page.evaluate("() => window.game.capybara.vy")
        page.wait_for_timeout(150)
        vy2 = page.evaluate("() => window.game.capybara.vy")
        page.keyboard.up("Space")

        # Net upward acceleration in soft zone should be significantly softened
        # (far less negative than the -920 px/s^2 full thrust)
        accel = (vy2 - vy1) / 0.15
        assert accel > -700, f"Expected attenuated upward accel > -700 px/s^2, got {accel}"

        browser.close()


def test_player_cannot_escape_maximum_playable_altitude():
    """Holding thrust continuously never allows player to breach 520px altitude."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1", charge_ms=300)

        # Hold Space continuously for 3.5 seconds
        page.keyboard.down("Space")
        max_seen_alt = 0

        for _ in range(18):
            page.wait_for_timeout(180)
            alt = get_altitude(page)
            if alt > max_seen_alt:
                max_seen_alt = alt
            assert alt <= 520.5, f"Altitude breached 520px limit: {alt}"

        page.keyboard.up("Space")
        assert max_seen_alt >= 450, f"Expected player to reach upper envelope, max was {max_seen_alt}"
        assert max_seen_alt <= 520.5, f"Maximum altitude exceeded safety clamp: {max_seen_alt}"

        browser.close()


def test_player_not_permanently_frozen_at_upper_boundary():
    """At the upper envelope, player continues moving horizontally and is not frozen."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1", charge_ms=300)

        page.keyboard.down("Space")
        # Wait until near envelope
        page.wait_for_timeout(1800)

        # Sample consecutive horizontal and vertical coordinates
        samples = []
        for _ in range(5):
            page.wait_for_timeout(80)
            x = page.evaluate("() => window.game.capybara.x")
            y = page.evaluate("() => window.game.capybara.y")
            vx = page.evaluate("() => window.game.capybara.vx")
            samples.append((x, y, vx))

        page.keyboard.up("Space")

        # Player must still be progressing forward down the course
        assert all(s[2] > 50 for s in samples), "Expected sustained horizontal forward velocity"
        assert samples[-1][0] > samples[0][0], "Expected horizontal displacement to increase"

        browser.close()


def test_releasing_thrust_near_upper_boundary_falls_immediately():
    """Releasing thrust in the upper envelope immediately produces natural freefall (+680 px/s^2)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1", charge_ms=300)

        # Climb to upper envelope
        page.keyboard.down("Space")
        page.wait_for_timeout(1800)
        alt_before_release = get_altitude(page)
        assert alt_before_release > 420, f"Expected high altitude, got {alt_before_release}"

        # Release thrust
        page.keyboard.up("Space")
        page.wait_for_timeout(250)

        vy_after = page.evaluate("() => window.game.capybara.vy")
        alt_after = get_altitude(page)

        # vy must be positive (falling downward) and altitude must be decreasing
        assert vy_after > 50, f"Expected positive downward velocity after release, got {vy_after}"
        assert alt_after < alt_before_release, f"Expected altitude to drop, before={alt_before_release}, after={alt_after}"

        browser.close()


def test_falling_away_from_boundary_restores_strong_thrust():
    """Falling below 400px altitude restores full jetpack thrust response."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1", charge_ms=250)

        # Climb then let fall
        page.keyboard.down("Space")
        page.wait_for_timeout(1400)
        page.keyboard.up("Space")

        # Wait until falling into normal zone below 380px
        for _ in range(25):
            page.wait_for_timeout(100)
            alt = get_altitude(page)
            vy = page.evaluate("() => window.game.capybara.vy")
            if alt < 380 and vy > 100:
                break

        vy_fall = page.evaluate("() => window.game.capybara.vy")

        # Re-engage thrust
        page.keyboard.down("Space")
        page.wait_for_timeout(250)
        vy_recover = page.evaluate("() => window.game.capybara.vy")
        page.keyboard.up("Space")

        diff = vy_recover - vy_fall
        assert diff < -120, f"Expected strong thrust recovery (diff < -120), got {diff}"

        browser.close()


def test_cannon_mouse_aiming_cannot_exceed_60_degrees():
    """Dragging mouse towards near-vertical cannot exceed 60 degrees (1.0472 rad)."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Drag aim almost straight up (x=75, y=0)
        canvas = page.locator("#gameCanvas")
        box = canvas.bounding_box()
        page.mouse.move(box["x"] + 70, box["y"] + 300)
        page.mouse.down()
        page.mouse.move(box["x"] + 75, box["y"] + 10)
        page.mouse.up()
        page.wait_for_timeout(100)

        angle = page.evaluate("() => window.game.world.cannonAngle")
        max_allowed = 60 * math.pi / 180
        assert angle <= max_allowed + 1e-4, f"Cannon angle {angle} exceeded 60 deg ({max_allowed})"

        browser.close()


def test_cannon_keyboard_aiming_cannot_exceed_60_degrees():
    """Pressing ArrowUp repeatedly cannot increase cannon angle past 60 degrees."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Hold ArrowUp for 1.5 seconds
        page.keyboard.down("ArrowUp")
        page.wait_for_timeout(1500)
        page.keyboard.up("ArrowUp")

        angle = page.evaluate("() => window.game.world.cannonAngle")
        max_allowed = 60 * math.pi / 180
        assert angle <= max_allowed + 1e-4, f"Cannon angle {angle} exceeded 60 deg ({max_allowed})"

        browser.close()


def test_cannon_cannot_go_below_10_degrees():
    """Aiming downward or pressing ArrowDown cannot lower angle below 10 degrees."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Hold ArrowDown for 1.5 seconds
        page.keyboard.down("ArrowDown")
        page.wait_for_timeout(1500)
        page.keyboard.up("ArrowDown")

        angle = page.evaluate("() => window.game.world.cannonAngle")
        min_allowed = 10 * math.pi / 180
        assert angle >= min_allowed - 1e-4, f"Cannon angle {angle} was below 10 deg ({min_allowed})"

        browser.close()


def test_maximum_cannon_angle_produces_forward_velocity():
    """At 60 deg max elevation, cannon launch guarantees at least 48% speed horizontally."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")
        page.wait_for_timeout(200)

        # Maximize angle with ArrowUp
        page.keyboard.down("ArrowUp")
        page.wait_for_timeout(1200)
        page.keyboard.up("ArrowUp")

        # Fire cannon with good charge
        page.keyboard.down("Space")
        page.wait_for_timeout(350)
        page.keyboard.up("Space")
        page.wait_for_timeout(80)

        vx = page.evaluate("() => window.game.capybara.vx")
        vy = page.evaluate("() => window.game.capybara.vy")
        speed = math.sqrt(vx * vx + vy * vy)

        assert speed > 400, f"Expected high launch speed, got {speed}"
        # cos(60 deg) = 0.50. Assert ratio is at least 0.48
        ratio = vx / speed
        assert ratio >= 0.48, f"Expected horizontal ratio >= 0.48, got {ratio}"

        browser.close()
