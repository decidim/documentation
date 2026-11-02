#!/usr/bin/env python3
"""Manage the Playwright authentication state for the Decidim admin.

The Decidim Nightly demo advertises its admin credentials publicly, so the
defaults below work out of the box. Override them (and the target instance)
with environment variables when needed:

    DECIDIM_URL              Base URL, defaults to https://nightly.decidim.org/en
    DECIDIM_ADMIN_EMAIL      Admin email, defaults to admin@example.org
    DECIDIM_ADMIN_PASSWORD   Admin password, defaults to decidim123456789

Usage:

    bin/screenshots-login.py .auth/nightly.json          Log in and save the state
    bin/screenshots-login.py --check .auth/nightly.json   Exit 0 if still signed in
"""

import argparse
import os
import sys

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("DECIDIM_URL", "https://nightly.decidim.org/en")
EMAIL = os.environ.get("DECIDIM_ADMIN_EMAIL", "admin@example.org")
PASSWORD = os.environ.get("DECIDIM_ADMIN_PASSWORD", "decidim123456789")
ADMIN_URL = f"{BASE_URL.rstrip('/')}/admin"


def _is_signed_in(page):
    return page.locator("a[href*='sign_out']").count() > 0


def check(state_path):
    """Return True when the saved state is still authenticated."""
    if not os.path.exists(state_path):
        return False

    with sync_playwright() as play:
        browser = play.chromium.launch()
        try:
            context = browser.new_context(storage_state=state_path)
            page = context.new_page()
            page.goto(ADMIN_URL, wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")
            return _is_signed_in(page)
        finally:
            browser.close()


def login(output):
    sign_in_url = f"{BASE_URL.rstrip('/')}/users/sign_in"

    with sync_playwright() as play:
        browser = play.chromium.launch()
        try:
            context = browser.new_context()
            page = context.new_page()
            page.goto(sign_in_url, wait_until="domcontentloaded")

            # The sign-in page contains two forms (the page form and the header
            # modal); scope to the page form so we fill/submit the same one.
            form = page.locator("form#session_new_user")
            if form.count() == 0:
                form = page.locator("form.new_user").first
            form.locator('input[name="user[email]"]').fill(EMAIL)
            form.locator('input[name="user[password]"]').fill(PASSWORD)
            with page.expect_navigation(timeout=20000):
                form.locator('button[type="submit"]').click()
            page.wait_for_load_state("networkidle")

            if not _is_signed_in(page):
                print(f"Login failed, still at {page.url}", file=sys.stderr)
                return 1

            os.makedirs(os.path.dirname(output) or ".", exist_ok=True)
            context.storage_state(path=output)
        finally:
            browser.close()

    print(f"Wrote authentication state to {output}", file=sys.stderr)
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Only check the stored state")
    parser.add_argument("output", help="Path to the Playwright storage state file")
    args = parser.parse_args()

    if args.check:
        return 0 if check(args.output) else 1
    return login(args.output)


if __name__ == "__main__":
    sys.exit(main())
