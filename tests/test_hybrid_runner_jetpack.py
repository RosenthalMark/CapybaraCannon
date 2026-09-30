"""
Automated Playwright Test Suite for Hybrid Gameplay:
1. Toggle Jetpack with 'J' (Dev mode / in-flight toggle).
2. Toggling off in flight triggers parachute deployment and gliding.
3. Fuel capacity (~5.5s) drains during thrust; fuel depletion auto-ejects jetpack and deploys parachute.
4. Ground contact alone NEVER ends the run; transitions into RUNNER mode.
5. Runner mode single jump and mid-air double jump.
6. Parachute touchdown smoothly transitions into RUNNER mode.
7. In-world JetpackPickup collection equips jetpack and refills fuel.
"""

import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}


def launch_game(page, url=BASE_URL, charge_ms=120):
    """Helper to start game from title and launch from cannon."""
    page.goto(url)
    page.wait_for_selector("#titleScreen:not(.hidden)")
    page.click("#titlePlayBtn")
    page.evaluate("() => window.game.finishCannonLoading()")
    page.wait_for_timeout(50)

    # Charge and fire
    page.keyboard.down("Space")
    page.wait_for_timeout(charge_ms)
    page.keyboard.up("Space")
    page.wait_for_timeout(150)


def test_toggle_jetpack_key_j():
    """Pressing 'J' equips jetpack; pressing 'J' again removes jetpack and deploys parachute."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page)

        # Confirm initial airborne state is FLIGHT
        state1 = page.evaluate("() => window.game.state")
        assert state1 == "FLIGHT" or state1 == "RUNNER", f"Expected FLIGHT/RUNNER, got {state1}"

        # Press J to equip jetpack
        page.keyboard.press("KeyJ")
        page.wait_for_timeout(100)

        state2 = page.evaluate("() => window.game.state")
        has_jp2 = page.evaluate("() => window.game.capybara.hasJetpack")
        assert state2 == "JETPACK_FLIGHT", f"Expected JETPACK_FLIGHT after 1st J, got {state2}"
        assert has_jp2 is True, "Expected capybara.hasJetpack to be True"

        # Press J again while airborne to toggle off
        page.keyboard.press("KeyJ")
        page.wait_for_timeout(100)

        state3 = page.evaluate("() => window.game.state")
        has_jp3 = page.evaluate("() => window.game.capybara.hasJetpack")
        is_chute3 = page.evaluate("() => window.game.capybara.isParachuting")
        assert state3 == "PARACHUTE_GLIDE", f"Expected PARACHUTE_GLIDE after 2nd J, got {state3}"
        assert has_jp3 is False, "Expected capybara.hasJetpack to be False"
        assert is_chute3 is True, "Expected capybara.isParachuting to be True"

        browser.close()


def test_fuel_depletion_auto_deploys_parachute():
    """Thrusting drains fuel; reaching 0 auto-ejects jetpack and deploys parachute."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, f"{BASE_URL}/?jetpack=1")

        # Set fuel to low amount to verify auto-depletion and parachute deploy
        page.evaluate("() => { window.game.jetpackFuel = 0.15; window.game.state = 'JETPACK_FLIGHT'; }")

        # Hold thrust
        page.keyboard.down("Space")
        page.wait_for_timeout(350)
        page.keyboard.up("Space")

        state = page.evaluate("() => window.game.state")
        has_jp = page.evaluate("() => window.game.capybara.hasJetpack")
        is_chute = page.evaluate("() => window.game.capybara.isParachuting")

        assert state == "PARACHUTE_GLIDE" or state == "RUNNER", f"Expected PARACHUTE_GLIDE or RUNNER, got {state}"
        assert has_jp is False, "Expected jetpack to be auto-ejected"

        browser.close()


def test_ground_contact_starts_runner_mode_without_game_over():
    """Hitting the ground alone NEVER ends the run; it transitions into RUNNER mode."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        # Low power launch to touch down quickly
        launch_game(page, BASE_URL, charge_ms=20)

        # Wait for capybara to touch ground
        page.wait_for_function(
            "() => window.game.capybara.isGrounded === true || window.game.state === 'RUNNER'",
            timeout=8000
        )

        state = page.evaluate("() => window.game.state")
        is_running = page.evaluate("() => window.game.capybara.isRunning")
        in_flight = page.evaluate("() => window.game.capybara.inFlight")
        vx = page.evaluate("() => window.game.capybara.vx")

        assert state == "RUNNER", f"Expected RUNNER state on touchdown, got {state}"
        assert is_running is True, "Expected capybara.isRunning to be True"
        assert in_flight is True, "Expected capybara.inFlight to remain True (run alive)"
        assert vx >= 300, f"Expected running cruise speed vx >= 300, got {vx}"

        browser.close()


def test_runner_jump_and_double_jump():
    """In RUNNER mode, action key triggers jump, and mid-air triggers double jump."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, BASE_URL, charge_ms=20)

        # Wait for RUNNER mode
        page.wait_for_function("() => window.game.state === 'RUNNER' && window.game.capybara.isGrounded", timeout=8000)

        # First Jump
        page.keyboard.press("Space")
        page.wait_for_timeout(80)

        vy1 = page.evaluate("() => window.game.capybara.vy")
        is_grounded1 = page.evaluate("() => window.game.capybara.isGrounded")
        assert vy1 < -200, f"Expected upward jump velocity vy < -200, got {vy1}"
        assert is_grounded1 is False, "Expected capybara.isGrounded to be False"

        # Mid-air Double Jump
        page.keyboard.press("Space")
        page.wait_for_timeout(80)

        has_dj = page.evaluate("() => window.game.capybara.hasDoubleJumped")
        vy2 = page.evaluate("() => window.game.capybara.vy")
        assert has_dj is True, "Expected capybara.hasDoubleJumped to be True"
        assert vy2 < -150, f"Expected upward double-jump velocity vy < -150, got {vy2}"

        browser.close()


def test_parachute_touchdown_transitions_to_runner():
    """When floating with parachute, touchdown packs chute and transitions into RUNNER mode."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, BASE_URL, charge_ms=10)

        # Deploy parachute in air
        page.evaluate("() => window.game.deployParachute()")
        state_air = page.evaluate("() => window.game.state")
        assert state_air == "PARACHUTE_GLIDE"

        # Wait for ground touchdown
        page.wait_for_function("() => window.game.state === 'RUNNER'", timeout=8000)

        state_land = page.evaluate("() => window.game.state")
        is_chute = page.evaluate("() => window.game.capybara.isParachuting")
        is_running = page.evaluate("() => window.game.capybara.isRunning")

        assert state_land == "RUNNER", f"Expected RUNNER, got {state_land}"
        assert is_chute is False, "Expected parachute to be packed upon touchdown"
        assert is_running is True, "Expected running mode active"

        browser.close()


def test_jetpack_pickup_equips_and_refills_fuel():
    """JetpackPickup equips jetpack, refills fuel to maximum, and sets JETPACK_FLIGHT."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, BASE_URL)

        # Deplete fuel or remove jetpack
        page.evaluate("() => { window.game.capybara.hasJetpack = false; window.game.jetpackFuel = 0; }")

        # Simulate collecting JetpackPickup
        page.evaluate("() => window.game.equipJetpack(true)")

        has_jp = page.evaluate("() => window.game.capybara.hasJetpack")
        fuel = page.evaluate("() => window.game.jetpackFuel")
        state = page.evaluate("() => window.game.state")

        assert has_jp is True, "Expected jetpack equipped"
        assert fuel == 8.5, f"Expected fuel refilled to 8.5s, got {fuel}"
        assert state == "JETPACK_FLIGHT", f"Expected state JETPACK_FLIGHT, got {state}"

        browser.close()


def test_parachute_steering_left_and_right():
    """Left/Right keys and touch steering modulate vx and bank angle during parachute glide."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, BASE_URL, charge_ms=100)

        # Deploy parachute
        page.evaluate("() => window.game.deployParachute()")
        assert page.evaluate("() => window.game.state") == "PARACHUTE_GLIDE"

        # Baseline velocity
        vx_initial = page.evaluate("() => window.game.capybara.vx")

        # Steer Left via key
        page.keyboard.down("ArrowLeft")
        page.wait_for_timeout(200)
        page.keyboard.up("ArrowLeft")

        vx_steer_left = page.evaluate("() => window.game.capybara.vx")
        angle_left = page.evaluate("() => window.game.capybara.angle")
        assert vx_steer_left < vx_initial, f"Steering left should reduce vx: {vx_steer_left} < {vx_initial}"
        assert angle_left < 0, f"Steering left should bank left (negative angle): {angle_left}"

        # Steer Right via touchSteerDirection
        page.evaluate("() => { window.game.touchSteerDirection = 1; }")
        page.wait_for_timeout(300)
        page.evaluate("() => { window.game.touchSteerDirection = 0; }")

        vx_steer_right = page.evaluate("() => window.game.capybara.vx")
        assert vx_steer_right > vx_steer_left, f"Steering right should increase vx: {vx_steer_right} > {vx_steer_left}"

        browser.close()


def test_custom_cannon_sprite_and_launch_blast():
    """Custom cannon sprite is loaded from assets/canon/cannon_launch_sequence.png and blasts on fire."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")

        # Check world cannon image src
        cannon_src = page.evaluate("() => window.game.world.cannonImage?.src || ''")
        assert "cannon_launch_sequence.png" in cannon_src, f"Expected custom cannon sequence sprite, got {cannon_src}"

        # Fire cannon and verify blast animation starts
        page.evaluate("() => { window.game.finishCannonLoading(); window.game.fireCannon(); }")
        is_blasting = page.evaluate("() => window.game.world.cannonLaunchAnimActive")
        blast_frame = page.evaluate("() => window.game.world.cannonLaunchFrame")

        assert is_blasting is True, "Cannon blast animation should be active upon firing"
        assert blast_frame >= 0, "Cannon blast frame should be valid index"

        browser.close()


def test_responsive_runner_jumps_and_camera_zoom():
    """Runner jumps have snappy platformer velocity and camera operates at close-up zoom."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        launch_game(page, BASE_URL, charge_ms=10)

        # Wait for RUNNER mode
        page.wait_for_function("() => window.game.state === 'RUNNER'", timeout=8000)

        zoom_runner = page.evaluate("() => window.game.camera.targetZoom")
        assert zoom_runner >= 1.30, f"Expected close-up camera zoom >= 1.30 in RUNNER mode, got {zoom_runner}"

        # Trigger snappy ground jump
        page.keyboard.press("Space")
        vy = page.evaluate("() => window.game.capybara.vy")
        assert vy <= -350, f"Expected snappy takeoff/jump vy <= -350, got {vy}"

        browser.close()


def test_warehouse_ceiling_collision_and_forward_boost():
    """Thrusting surges vx forward, climbs upward, and clamps cleanly at warehouse ceiling."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?direct=1")
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")

        # Confirm direct warehouse start
        page.wait_for_function("() => window.game.state === 'RUNNER' || window.game.state === 'JETPACK_FLIGHT'")
        has_jp = page.evaluate("() => window.game.capybara.hasJetpack")
        assert has_jp is True, "Expected capybara to have permanent jetpack equipped"

        # Check ceiling definition
        ceil_y = page.evaluate("() => window.game.world.getCeilingY(300)")
        ground_y = page.evaluate("() => window.game.world.getGroundY(300)")
        assert ceil_y < ground_y, f"Ceiling ({ceil_y}) should be above ground ({ground_y})"
        assert ground_y - ceil_y >= 450, "Warehouse corridor height should be >= 450px"

        vx_start = page.evaluate("() => window.game.capybara.vx")

        # Hold thrust for 1.2s to climb to ceiling and surge forward
        page.keyboard.down("Space")
        page.wait_for_timeout(1200)
        page.keyboard.up("Space")

        vx_boosted = page.evaluate("() => window.game.capybara.vx")
        capy_y = page.evaluate("() => window.game.capybara.y")
        curr_ceil = page.evaluate("() => window.game.world.getCeilingY(window.game.capybara.x)")
        radius = page.evaluate("() => window.game.capybara.radius")

        # Forward boost surge
        assert vx_boosted > vx_start, f"Thrust should surge vx forward: {vx_boosted} > {vx_start}"

        # Ceiling clamp: Capy should not penetrate above ceiling (y >= curr_ceil + radius)
        assert capy_y >= curr_ceil + radius - 2, f"Capy clamped below ceiling: {capy_y} >= {curr_ceil + radius}"

        browser.close()


def test_ground_recharge_and_no_flat_freeze():
    """Ground running recharges jetpack battery and airborne pose never freezes flat on frame 5."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(f"{BASE_URL}/?direct=1")
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.click("#titlePlayBtn")

        # Burn some fuel in air
        page.evaluate("() => { window.game.jetpackFuel = 4.0; window.game.capybara.y = 400; window.game.capybara.vy = 100; window.game.capybara.isGrounded = false; }")

        # Trigger jump in air and verify it never freezes on flat frame 5
        page.evaluate("() => window.game.capybara.anim.play('jump')")
        page.wait_for_timeout(600)
        anim_name = page.evaluate("() => window.game.capybara.anim.currentAnim")
        frame_idx = page.evaluate("() => window.game.capybara.anim.frameIndex")
        if anim_name == 'jump':
            assert frame_idx < 5, f"Airborne jump animation should never freeze on flat frame 5, got frame {frame_idx}"

        # Touch down and verify battery recharges
        page.wait_for_function("() => window.game.capybara.isGrounded === true", timeout=6000)
        fuel_touchdown = page.evaluate("() => window.game.jetpackFuel")
        page.wait_for_timeout(800)
        fuel_recharged = page.evaluate("() => window.game.jetpackFuel")

        assert fuel_recharged > fuel_touchdown, f"Battery should recharge while running: {fuel_recharged} > {fuel_touchdown}"

        browser.close()


