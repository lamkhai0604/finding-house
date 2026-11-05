#!/usr/bin/env python3
"""Load sample-data.json into a running Finding House backend (T-009).

Usage:
    python3 scripts/sample-data/load_sample_data.py [--base-url URL] [--check-invalid]

- Registers the sample users (an existing account is reused), logs them in,
  and creates their listings. Listings whose title the landlord already has
  are skipped, so running the script twice does not create duplicates.
- --check-invalid also sends the invalidExamples and checks the expected
  status codes and field errors.

Standard library only. Exits with status 1 on the first unexpected response.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

DATA_FILE = Path(__file__).with_name("sample-data.json")


class Api:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")

    def call(self, method, path, body=None, token=None):
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(self.base_url + path, data=data, method=method)
        if body is not None:
            request.add_header("Content-Type", "application/json")
        if token:
            request.add_header("Authorization", "Bearer " + token)
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, _json(response.read())
        except urllib.error.HTTPError as error:
            return error.code, _json(error.read())


def _json(raw):
    try:
        return json.loads(raw) if raw else None
    except json.JSONDecodeError:
        return raw.decode(errors="replace")


def fail(message):
    print("FAIL: " + message, file=sys.stderr)
    sys.exit(1)


def load_users(api, users):
    tokens = {}
    for user in users:
        register = {k: v for k, v in user["register"].items() if v is not None}
        status, body = api.call("POST", "/api/v1/auth/register", register)
        if status == 201:
            print(f"ok   registered {register['email']} ({register['role']})")
        elif status == 409:
            print(f"ok   {register['email']} already exists, reusing it")
        else:
            fail(f"register {register['email']}: {status} {body}")
        status, body = api.call(
            "POST",
            "/api/v1/auth/login",
            {"email": register["email"], "password": register["password"]},
        )
        if status != 200:
            fail(f"login {register['email']}: {status} {body}")
        tokens[user["key"]] = body["accessToken"]
    return tokens


def load_listings(api, listings, tokens):
    existing = {}
    created = skipped = 0
    for listing in listings:
        owner = listing["owner"]
        token = tokens[owner]
        if owner not in existing:
            status, body = api.call("GET", "/api/v1/me/listings", token=token)
            if status != 200:
                fail(f"my listings for {owner}: {status} {body}")
            existing[owner] = {item["title"] for item in body}
        title = listing["body"]["title"]
        if title in existing[owner]:
            skipped += 1
            continue
        status, body = api.call("POST", "/api/v1/listings", listing["body"], token)
        if status != 201:
            fail(f"create '{title}': {status} {body}")
        if listing.get("status", "ACTIVE") != "ACTIVE":
            status, body = api.call(
                "PATCH",
                f"/api/v1/listings/{body['id']}/status",
                {"status": listing["status"]},
                token,
            )
            if status != 200:
                fail(f"set status of '{title}': {status} {body}")
        existing[owner].add(title)
        created += 1
        print(f"ok   created '{title}' ({listing.get('status', 'ACTIVE')})")
    print(f"listings: {created} created, {skipped} already present")


def check_invalid(api, examples, tokens):
    for example in examples:
        token = tokens.get(example["as"]) if example.get("as") else None
        status, body = api.call(example["method"], example["path"], example["body"], token)
        if status != example["expectedStatus"]:
            fail(f"{example['description']}: expected {example['expectedStatus']}, got {status} {body}")
        expected_fields = example.get("expectedFieldErrors")
        if expected_fields is not None:
            actual = sorted(error["field"] for error in body.get("fieldErrors", []))
            if actual != sorted(expected_fields):
                fail(f"{example['description']}: expected field errors {expected_fields}, got {actual}")
        print(f"ok   {example['description']} -> {status}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--check-invalid", action="store_true")
    args = parser.parse_args()

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    api = Api(args.base_url)
    tokens = load_users(api, data["users"])
    load_listings(api, data["listings"], tokens)
    if args.check_invalid:
        check_invalid(api, data["invalidExamples"], tokens)
    print("sample data loaded")


if __name__ == "__main__":
    main()
