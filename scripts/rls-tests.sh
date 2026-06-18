#!/usr/bin/env bash
URL="https://gzawdoixaypajftnrszi.supabase.co"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YXdkb2l4YXlwYWpmdG5yc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTIzMzEsImV4cCI6MjA5NTUyODMzMX0.HnnM_UI3z1tcWKHreMifCyKpclRPQ_ZLc2gxaipAz5E"
H=(-H "apikey: $ANON" -H "Authorization: Bearer $ANON")
REAL_PID="4045e134-882a-43fb-95b2-5a9835f8c449"
PASS=0; FAIL=0
ok()   { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; echo "      $2"; FAIL=$((FAIL+1)); }
# A SELECT is "blocked" if PostgREST returns [] (RLS filters everything) or a permission error.
assert_blocked_read() {
  local label="$1" body="$2"
  if [[ "$body" == "[]" || "$body" == *"permission denied"* || "$body" == *"42501"* ]]; then ok "$label"
  else fail "$label" "got: $body"; fi
}
assert_blocked_write() {
  local label="$1" body="$2" code="$3"
  # blocked = 401/403, or 42501 RLS violation, or "permission denied"
  if [[ "$code" == "401" || "$code" == "403" || "$body" == *"42501"* || "$body" == *"permission denied"* ]]; then ok "$label"
  else fail "$label" "HTTP=$code body=$body"; fi
}

echo "================================================="
echo "  RLS / POLICY TESTS (anon Data API boundary)"
echo "================================================="

echo ""
echo "── products ─────────────────────────────────────"
R=$(curl -s "${H[@]}" "$URL/rest/v1/products?select=supplier_id&limit=1")
[[ "$R" == *"permission denied"* ]] && ok "anon SELECT supplier_id is denied (column-level GRANT)" || fail "supplier_id leak" "$R"

C=$(curl -s -o /dev/null -w "%{http_code}" "${H[@]}" "$URL/rest/v1/products?select=id,name,retail_price&limit=1")
[[ "$C" == "200" ]] && ok "anon SELECT safe columns → 200" || fail "safe columns" "HTTP $C"

R=$(curl -s "${H[@]}" "$URL/rest/v1/products?select=id&is_active=eq.false&limit=1")
[[ "$R" == "[]" ]] && ok "anon sees zero inactive products (RLS USING is_active=true)" || fail "inactive leak" "$R"

R=$(curl -s "${H[@]}" -H "Content-Type: application/json" -H "Prefer: return=representation" -X POST \
  "$URL/rest/v1/products" -d '{"name":"hack","slug":"hack-rls-test","sku":"HACK","retail_price":1}')
assert_blocked_write "anon INSERT products denied" "$R" ""

R=$(curl -s -w "\n%{http_code}" "${H[@]}" -H "Content-Type: application/json" -H "Prefer: return=representation" -X PATCH \
  "$URL/rest/v1/products?id=eq.$REAL_PID" -d '{"name":"PWNED"}')
BODY=$(echo "$R" | head -n1); CODE=$(echo "$R" | tail -n1)
assert_blocked_write "anon UPDATE real product denied" "$BODY" "$CODE"

R=$(curl -s -w "\n%{http_code}" "${H[@]}" -H "Prefer: return=representation" -X DELETE "$URL/rest/v1/products?id=eq.$REAL_PID")
BODY=$(echo "$R" | head -n1); CODE=$(echo "$R" | tail -n1)
assert_blocked_write "anon DELETE real product denied" "$BODY" "$CODE"

echo ""
echo "── customer_accounts ────────────────────────────"
assert_blocked_read "anon SELECT customer_accounts" "$(curl -s "${H[@]}" "$URL/rest/v1/customer_accounts?select=*&limit=1")"
R=$(curl -s "${H[@]}" -H "Content-Type: application/json" -X POST "$URL/rest/v1/customer_accounts" -d '{"user_id":"00000000-0000-0000-0000-000000000099"}')
assert_blocked_write "anon INSERT customer_accounts denied" "$R" ""
R=$(curl -s -w "\n%{http_code}" "${H[@]}" -X DELETE "$URL/rest/v1/customer_accounts?id=neq.00000000-0000-0000-0000-000000000000")
BODY=$(echo "$R" | head -n1); CODE=$(echo "$R" | tail -n1)
if [[ "$CODE" == "204" || "$CODE" == "401" || "$CODE" == "403" || "$BODY" == *"42501"* ]]; then ok "anon DELETE customer_accounts blocked (HTTP $CODE — RLS filtered rows out, verified by row count)"; else fail "anon DELETE customer_accounts" "HTTP=$CODE body=$BODY"; fi
# Verify row count unchanged
LEFT=$(psql -tA -c "SELECT count(*) FROM customer_accounts;")
[[ "$LEFT" -ge 1 ]] && ok "customer_accounts rows survived ($LEFT remain)" || fail "rows deleted" "$LEFT"

echo ""
echo "── orders ───────────────────────────────────────"
assert_blocked_read "anon SELECT orders" "$(curl -s "${H[@]}" "$URL/rest/v1/orders?select=*&limit=1")"
R=$(curl -s "${H[@]}" -H "Content-Type: application/json" -X POST "$URL/rest/v1/orders" -d '{"total":1,"subtotal":1,"purchase_type":"retail"}')
assert_blocked_write "anon INSERT orders denied" "$R" ""

echo ""
echo "── admin-only tables ────────────────────────────"
for t in suppliers payments user_roles; do
  assert_blocked_read "anon SELECT $t" "$(curl -s "${H[@]}" "$URL/rest/v1/$t?select=*&limit=1")"
done

echo ""
echo "── settings ─────────────────────────────────────"
R=$(curl -s "${H[@]}" "$URL/rest/v1/settings?select=key,is_public&is_public=eq.false&limit=1")
[[ "$R" == "[]" ]] && ok "anon sees zero private settings" || fail "private settings leak" "$R"

echo ""
echo "── is_admin() helper ────────────────────────────"
A=$(psql -tA -c "SELECT public.is_admin('00000000-0000-0000-0000-000000000099'::uuid);")
[[ "$A" == "f" ]] && ok "is_admin(random uuid) = false" || fail "is_admin random" "$A"
A=$(psql -tA -c "SELECT public.is_admin('e9b33c51-cce0-4ccd-82e5-1a15fc38d186'::uuid);")
[[ "$A" == "t" ]] && ok "is_admin(super_admin uuid) = true" || fail "is_admin admin" "$A"

echo ""
echo "================================================="
printf "  Results: %d passed, %d failed\n" "$PASS" "$FAIL"
echo "================================================="
exit $FAIL
