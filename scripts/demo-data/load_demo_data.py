#!/usr/bin/env python3
"""Load the demo content (demo-data.json) into a running Finding House backend (T-215).

Usage:
    DEMO_PASSWORD=... python3 scripts/demo-data/load_demo_data.py --base-url URL [--check-images]

- The demo accounts' password comes from the DEMO_PASSWORD environment variable, never from the
  repository. It must be 12 to 72 characters. On the live site it is a GitHub Actions secret.
- Accounts that already exist are reused (the password must match); listings whose title the
  landlord already has are skipped, so running it twice creates nothing new.
- --check-images first checks that every photo link answers 200 with an image.
- --base-url has no default, so the target is always written out.

Standard library only. Exits with status 1 on the first unexpected response.
"""

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "sample-data"))

from load_sample_data import Api, fail, load_listings, load_users  # noqa: E402

DATA_FILE = HERE / "demo-data.json"


def password_from_env():
    password = os.environ.get("DEMO_PASSWORD", "")
    if not 12 <= len(password.encode()) <= 72:
        fail("set DEMO_PASSWORD to a password of 12 to 72 bytes (it is not stored in the repo)")
    return password


def with_password(users, password):
    return [
        {**user, "register": {**user["register"], "password": password}} for user in users
    ]


def check_images(listings):
    urls = sorted({url for listing in listings for url in listing["body"]["imageUrls"]})
    for url in urls:
        request = urllib.request.Request(
            url, method="GET", headers={"User-Agent": "finding-house-demo-check"}
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                kind = response.headers.get("Content-Type", "")
                if response.status != 200 or not kind.startswith("image/"):
                    fail(f"photo {url}: {response.status} {kind}")
        except OSError as error:
            fail(f"photo {url}: {error}")
    print(f"ok   {len(urls)} photo links answer with an image")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--check-images", action="store_true")
    args = parser.parse_args()

    password = password_from_env()
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    if args.check_images:
        check_images(data["listings"])
    api = Api(args.base_url)
    tokens = load_users(api, with_password(data["users"], password))
    load_listings(api, data["listings"], tokens)
    print("demo data loaded")


if __name__ == "__main__":
    main()
