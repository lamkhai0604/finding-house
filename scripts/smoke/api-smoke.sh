#!/usr/bin/env bash
# T-008: API smoke test against a running backend (default http://localhost:8080).
# Exercises the FR-01 happy path and one rejection end to end. Exits non-zero on the first failure.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="smoke-$(date +%s)-$RANDOM@example.com"
PASSWORD="smoke-test-password"

fail() { echo "FAIL: $*" >&2; exit 1; }

# request METHOD PATH [JSON] [TOKEN] -> prints body, sets STATUS
request() {
  local method=$1 path=$2 data=${3:-} token=${4:-}
  local args=(-s -o /tmp/smoke-body -w '%{http_code}' -X "$method" "$BASE_URL$path")
  [[ -n "$data" ]] && args+=(-H 'Content-Type: application/json' -d "$data")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  STATUS=$(curl "${args[@]}")
  BODY=$(cat /tmp/smoke-body)
}

request GET /actuator/health
[[ "$STATUS" == 200 && "$BODY" == *'"UP"'* ]] || fail "health: $STATUS $BODY"
echo "ok   health is UP"

request POST /api/v1/auth/register \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"Smoke\",\"role\":\"LANDLORD\"}"
[[ "$STATUS" == 201 ]] || fail "register: $STATUS $BODY"
echo "ok   register landlord -> 201"

request POST /api/v1/auth/register \
  "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"displayName\":\"Again\",\"role\":\"TENANT\"}"
[[ "$STATUS" == 409 ]] || fail "duplicate register: $STATUS $BODY"
echo "ok   duplicate email -> 409"

request POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"wrong-password\"}"
[[ "$STATUS" == 401 ]] || fail "wrong password: $STATUS $BODY"
echo "ok   wrong password -> 401"

request POST /api/v1/auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
[[ "$STATUS" == 200 ]] || fail "login: $STATUS $BODY"
TOKEN=$(echo "$BODY" | python3 -c 'import sys, json; print(json.load(sys.stdin)["accessToken"])')
echo "ok   login -> 200 with token"

request GET /api/v1/me "" "$TOKEN"
[[ "$STATUS" == 200 && "$BODY" == *"\"$EMAIL\""* ]] || fail "me: $STATUS $BODY"
echo "ok   /me with token -> 200, correct user"

request GET /api/v1/me
[[ "$STATUS" == 401 ]] || fail "me without token: $STATUS $BODY"
echo "ok   /me without token -> 401"

echo "API smoke test passed"
