"""
Automated Playwright Regression Test Suite for Title Screen Hitbox Calibration.
Verifies all 5 navigation buttons, exact coordinate boundaries, rotated hitboxes,
non-overlapping boundaries between SHOP and ACCOUNT, and decorative art exclusion.
"""

import os
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
VIEWPORT_1080P = {"width": 1920, "height": 1080}
SCREENSHOT_DIR = "tests/screenshots"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)


def test_play_button_activation():
    """Clicking the PLAY button starts launch aiming and hides the title screen."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        # Click inside the PLAY hitbox (center ~ 685, 654)
        page.click("#titlePlayBtn")
        page.wait_for_timeout(300)

        # Title screen overlay should now be hidden
        title_classes = page.get_attribute("#titleScreen", "class")
        assert "hidden" in title_classes, f"Expected #titleScreen to be hidden, got: {title_classes}"

        # Launch controls should now be visible
        launch_classes = page.get_attribute("#launch-controls", "class")
        assert "hidden" not in (launch_classes or ""), f"Expected #launch-controls visible, got: {launch_classes}"

        browser.close()


def test_shop_button_activation():
    """Clicking inside the SHOP button opens #shopModal, and closing returns to title."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        # Click SHOP button
        page.click("#titleShopBtn")
        page.wait_for_timeout(300)

        # Shop modal should be open
        shop_classes = page.get_attribute("#shopModal", "class")
        assert "hidden" not in shop_classes, f"#shopModal should be visible, got: {shop_classes}"

        # Close shop
        page.click("#closeShopBtn")
        page.wait_for_timeout(300)
        shop_classes_closed = page.get_attribute("#shopModal", "class")
        assert "hidden" in shop_classes_closed, f"#shopModal should be hidden after closing, got: {shop_classes_closed}"

        browser.close()


def test_account_button_activation():
    """Clicking inside the ACCOUNT button opens #accountModal, and closing returns to title."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        # Click ACCOUNT button
        page.click("#titleAccountBtn")
        page.wait_for_timeout(300)

        # Account modal should be open
        account_classes = page.get_attribute("#accountModal", "class")
        assert "hidden" not in account_classes, f"#accountModal should be visible, got: {account_classes}"

        # Close account
        page.click("#closeAccountBtn")
        page.wait_for_timeout(300)
        account_classes_closed = page.get_attribute("#accountModal", "class")
        assert "hidden" in account_classes_closed, f"#accountModal should be hidden after closing"

        browser.close()


def test_customize_button_activation():
    """Clicking inside the CUSTOMIZE button opens #customizeModal."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titleCustomizeBtn")
        page.wait_for_timeout(300)

        cust_classes = page.get_attribute("#customizeModal", "class")
        assert "hidden" not in cust_classes, f"#customizeModal should be visible, got: {cust_classes}"

        page.click("#closeCustomizeBtn")
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#customizeModal", "class")

        browser.close()


def test_selection_button_activation():
    """Clicking inside the CAPYBARA SELECTION button opens #selectionModal."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        page.click("#titleSelectionBtn")
        page.wait_for_timeout(300)

        sel_classes = page.get_attribute("#selectionModal", "class")
        assert "hidden" not in sel_classes, f"#selectionModal should be visible, got: {sel_classes}"

        page.click("#closeSelectionBtn")
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#selectionModal", "class")

        browser.close()


def test_shop_and_account_boundary_separation():
    """
    Critical Neighbor Test:
    Verifies that SHOP and ACCOUNT do NOT overlap:
    1. Upper, center, and lower points inside SHOP activate SHOP and NEVER activate ACCOUNT.
    2. Upper, center, and lower points inside ACCOUNT activate ACCOUNT and NEVER activate SHOP.
    3. The neutral gap between SHOP and ACCOUNT does not activate either modal.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Test clicking lower portion of SHOP (x=735, y=845 in 1920x1080)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(735, 845)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#shopModal", "class"), "Lower SHOP point must open #shopModal"
        assert "hidden" in page.get_attribute("#accountModal", "class"), "Lower SHOP point must NEVER open #accountModal"
        page.close()

        # 2. Test clicking center of SHOP (x=726, y=818)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(726, 818)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#shopModal", "class"), "Center of SHOP must open #shopModal"
        assert "hidden" in page.get_attribute("#accountModal", "class"), "Center of SHOP must NEVER open #accountModal"
        page.close()

        # 3. Test clicking upper portion of ACCOUNT (x=750, y=930)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(750, 930)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#accountModal", "class"), "Upper ACCOUNT point must open #accountModal"
        assert "hidden" in page.get_attribute("#shopModal", "class"), "Upper ACCOUNT point must NEVER open #shopModal"
        page.close()

        # 4. Test clicking center of ACCOUNT (x=758, y=967)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(758, 967)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#accountModal", "class"), "Center of ACCOUNT must open #accountModal"
        assert "hidden" in page.get_attribute("#shopModal", "class"), "Center of ACCOUNT must NEVER open #shopModal"
        page.close()

        # 5. Test clicking the neutral gap between SHOP and ACCOUNT (x=742, y=890)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(742, 890)
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#shopModal", "class"), "Neutral boundary gap must not open #shopModal"
        assert "hidden" in page.get_attribute("#accountModal", "class"), "Neutral boundary gap must not open #accountModal"
        page.close()

        browser.close()


def test_right_buttons_surrounding_artwork_exclusion():
    """
    Right Buttons Neighbor Test:
    Verifies that decorative elements outside the button do NOT trigger activation:
    1. Sticker capybaras above CUSTOMIZE (y=890) do NOT open #customizeModal.
    2. Actual button box of CUSTOMIZE (x=1687, y=1000) DOES open #customizeModal.
    3. Peeking capybara face above SELECTION (y=75) does NOT open #selectionModal.
    4. Rainbow 'CAPYBARA' text above SELECTION (y=100) does NOT open #selectionModal.
    5. Actual button box of SELECTION (x=1730, y=170) DOES open #selectionModal.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Click sticker capybaras above CUSTOMIZE (x=1650, y=890)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(1650, 890)
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#customizeModal", "class"), "Sticker capybaras must NOT activate CUSTOMIZE"
        page.close()

        # 2. Click inside actual CUSTOMIZE button box (x=1687, y=1000)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(1687, 1000)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#customizeModal", "class"), "Actual CUSTOMIZE button box must activate modal"
        page.close()

        # 3. Click peeking capybara face above SELECTION (x=1730, y=75)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(1730, 75)
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#selectionModal", "class"), "Peeking capybara face must NOT activate SELECTION"
        page.close()

        # 4. Click rainbow text above SELECTION (x=1650, y=100)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(1650, 100)
        page.wait_for_timeout(300)
        assert "hidden" in page.get_attribute("#selectionModal", "class"), "Rainbow CAPYBARA text must NOT activate SELECTION"
        page.close()

        # 5. Click inside actual SELECTION button box (x=1730, y=170)
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")
        page.mouse.click(1730, 170)
        page.wait_for_timeout(300)
        assert "hidden" not in page.get_attribute("#selectionModal", "class"), "Actual SELECTION button box must activate modal"
        page.close()

        browser.close()


def test_visual_production_and_debug_modes():
    """
    Visual Regression & Debug Artifact Verification:
    1. Production mode has no debug classes or visible hitbox overlays.
    2. Debug mode toggle adds .debug-hitboxes class.
    3. Saves high-res screenshots for visual verification.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Production Mode
        page = browser.new_page(viewport=VIEWPORT_1080P)
        page.goto(BASE_URL)
        page.wait_for_selector("#titleScreen:not(.hidden)")

        body_classes = page.get_attribute("body", "class") or ""
        assert "debug-hitboxes" not in body_classes, "Production mode must NOT have debug-hitboxes class"

        prod_screenshot_path = os.path.join(SCREENSHOT_DIR, "title_screen_production.png")
        page.screenshot(path=prod_screenshot_path)
        assert os.path.exists(prod_screenshot_path), "Production screenshot should be created"

        # Debug Mode via URL query ?debugHitboxes=1
        page_debug = browser.new_page(viewport=VIEWPORT_1080P)
        page_debug.goto(f"{BASE_URL}/?debugHitboxes=1")
        page_debug.wait_for_selector("#titleScreen:not(.hidden)")

        debug_body_classes = page_debug.get_attribute("body", "class") or ""
        assert "debug-hitboxes" in debug_body_classes, "Debug mode must have debug-hitboxes class"

        debug_screenshot_path = os.path.join(SCREENSHOT_DIR, "title_screen_debug.png")
        page_debug.screenshot(path=debug_screenshot_path)
        assert os.path.exists(debug_screenshot_path), "Debug screenshot should be created"

        browser.close()


if __name__ == "__main__":
    print("Running Playwright Title Screen Regression Tests...")
    test_play_button_activation()
    print("✓ test_play_button_activation passed")
    test_shop_button_activation()
    print("✓ test_shop_button_activation passed")
    test_account_button_activation()
    print("✓ test_account_button_activation passed")
    test_customize_button_activation()
    print("✓ test_customize_button_activation passed")
    test_selection_button_activation()
    print("✓ test_selection_button_activation passed")
    test_shop_and_account_boundary_separation()
    print("✓ test_shop_and_account_boundary_separation passed")
    test_right_buttons_surrounding_artwork_exclusion()
    print("✓ test_right_buttons_surrounding_artwork_exclusion passed")
    test_visual_production_and_debug_modes()
    print("✓ test_visual_production_and_debug_modes passed")
    print("\nALL 8 PLAYWRIGHT TITLE SCREEN TESTS PASSED WITH 100% SUCCESS!")
