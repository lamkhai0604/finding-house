#!/usr/bin/env bash
# T-405: read-only HTTP checks against a deployed frontend and API (D-029, D-030).
# Usage: FRONTEND_URL=https://<app>.vercel.app API_URL=https://<api>.onrender.com bash live-checks.sh
# SKIP_FRONTEND_HEADERS=1 skips the checks that only the Vercel host can pass (used by CI locally).
set -uo pipefail

FRONTEND_URL="${FRONTEND_URL%/}"
API_URL="${API_URL%/}"
failures=0
ok() { echo "ok   $*"; }
bad() { echo "FAIL $*"; failures=$((failures + 1)); }
status() { curl -s -o "${2:-/dev/null}" -w '%{http_code}' --max-time 30 "${@:3}" "$1"; }

# The free backend sleeps after 15 idle minutes and needs about a minute to wake up.
for i in $(seq 1 36); do
  if curl -sf --max-time 10 "$API_URL/actuator/health" | grep -q '"UP"'; then
    ok "API healthy (after about $(((i - 1) * 5)) s)"
    break
  fi
  if [ "$i" = 36 ]; then
    bad "API not healthy after 3 minutes"
    exit 1
  fi
  sleep 5
done

case "$API_URL" in
  https://*) ok "API uses https" ;;
  http://localhost:* | http://127.0.0.1:*) ok "API is local (CI self-test)" ;;
  *) bad "API URL is not https: $API_URL" ;;
esac

code=$(status "$API_URL/api/v1/reference-data" /tmp/live-ref.json)
if [ "$code" = 200 ] && grep -q '"Seattle"' /tmp/live-ref.json; then ok "reference data"; else bad "reference data -> $code"; fi

code=$(status "$API_URL/api/v1/listings?size=1")
[ "$code" = 200 ] && ok "browse API" || bad "browse API -> $code"

# T-302: the AI search endpoint answers (on or off). Read-only: it only reports availability.
ai=$(curl -s --max-time 20 "$API_URL/api/v1/search/interpret" || true)
if printf '%s' "$ai" | grep -Eq '"available":(true|false)'; then
  ok "AI search status: $(printf '%s' "$ai" | grep -Eo '"available":(true|false)')"
else
  bad "AI search status endpoint -> $ai"
fi

code=$(status "$API_URL/api/v1/me")
[ "$code" = 401 ] && ok "/me without a token -> 401" || bad "/me without a token -> $code"

code=$(status "$API_URL/actuator/env")
if [ "$code" = 401 ] || [ "$code" = 404 ]; then ok "/actuator/env not exposed ($code)"; else bad "/actuator/env -> $code"; fi

origin=$(printf '%s' "$FRONTEND_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
allow=$(curl -s -D - -o /dev/null --max-time 30 -X OPTIONS \
  -H "Origin: $origin" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  "$API_URL/api/v1/auth/login" | tr -d '\r' | grep -i '^access-control-allow-origin:' | cut -d' ' -f2-)
[ "$allow" = "$origin" ] && ok "CORS allows the frontend ($origin)" || bad "CORS preflight from $origin answered '$allow'"

code=$(status "$API_URL/api/v1/auth/login" /dev/null -X OPTIONS \
  -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST")
[ "$code" = 403 ] && ok "CORS refuses other origins" || bad "preflight from another origin -> $code"

if [ "${SKIP_FRONTEND_HEADERS:-}" != 1 ]; then
  headers=$(curl -s -D - -o /tmp/live-index.html --max-time 30 "$FRONTEND_URL/" | tr -d '\r')
  for want in "x-content-type-options: nosniff" "x-frame-options: deny" \
    "content-security-policy: frame-ancestors 'none'" "strict-transport-security:"; do
    printf '%s\n' "$headers" | grep -qi "^$want" && ok "frontend header: $want" || bad "frontend header missing: $want"
  done
  if grep -q "connect-src" /tmp/live-index.html && grep -qF "$API_URL" /tmp/live-index.html; then
    ok "page CSP allows the API origin"
  else
    bad "page CSP does not name $API_URL (VITE_API_BASE_URL at build time?)"
  fi
  code=$(status "$FRONTEND_URL/browse" /tmp/live-browse.html)
  if [ "$code" = 200 ] && grep -q 'id="root"' /tmp/live-browse.html; then
    ok "/browse serves the app (SPA routing)"
  else
    bad "/browse -> $code"
  fi
fi

echo "$failures failure(s)"
[ "$failures" = 0 ]
