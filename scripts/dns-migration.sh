#!/usr/bin/env bash
set -euo pipefail

ZONE_ID="401c00755685fe367d06cbf7827c1ddb"
API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RECORDS_FILE="${SCRIPT_DIR}/dns-records.json"

auth_header="Authorization: Bearer ${CLOUDFLARE_API_TOKEN:?missing CLOUDFLARE_API_TOKEN}"

# --- preserve list ---
# only exact-match names are checked; patterns use is_preserved_pattern
PRESERVE_NAMES=(
  # cognito custom domains
  "auth.better.giving"
  "auth-test.better.giving"
  "oauth.better.giving"
  # acm cert validation (active certs)
  # _926407ef... shared by wildcard + better.giving certs — sst recreates this
  "_0545de0e295bc2dedb826830db3161e8.oauth.better.giving"  # oauth.better.giving
  "_ee74c8e0c4c7cfe6932be62ef43e810a.staging.better.giving"  # staging.better.giving
  "_a7d8a9224cb3c211b183a9b7659b2a58.sst.better.giving"  # sst.better.giving
  # ses dkim + spf + mail-from
  "arcaxab6y2jy4aj2ytbjd2kjyxywimzn._domainkey.better.giving"
  "5rrdcnvq7kakyhghlad3twihcbkbyscr._domainkey.better.giving"
  "73hvyqxygqsecqzs7i3yejwgw6cld3rn._domainkey.better.giving"
  "amazon-ses-spf.better.giving"
  "mail.better.giving"
  "send.better.giving"
  # google workspace (email)
  "google._domainkey.better.giving"
  "google._domainkey.connect.better.giving"
  "_dmarc.better.giving"
  "_dmarc.connect.better.giving"
  "connect.better.giving"
  "p5u2moxmnao4.better.giving"
  # hubspot dkim
  "hs1-24900163._domainkey.better.giving"
  "hs2-24900163._domainkey.better.giving"
  # intercom
  "intercom._domainkey.better.giving"
  "outbound.intercom.better.giving"
  # resend dkim
  "resend._domainkey.better.giving"
  # twilio
  "donate.better.giving"
  "_twilio.donate.better.giving"
  # dashlane
  "_dashlane-challenge.better.giving"
  # api gateway
  "ap-api.better.giving"
  "apes-api.better.giving"
  # active sst deployments
  "staging.better.giving"
  "sst.better.giving"
  # other active subdomains
  "app.better.giving"
  "calendar.better.giving"
  "church.better.giving"
  "logevity.better.giving"
  "blackhistorymonth.better.giving"
  "mentalhealth.better.giving"
  "ukraine.better.giving"
  "restore-earth.better.giving"
)

is_preserved() {
  local name="$1"
  for p in "${PRESERVE_NAMES[@]}"; do
    if [ "$name" = "$p" ]; then
      return 0
    fi
  done
  # preserve all MX and TXT at apex + connect (google workspace email)
  if [ "$name" = "better.giving" ] || [ "$name" = "connect.better.giving" ]; then
    local type="$2"
    if [ "$type" = "MX" ] || [ "$type" = "TXT" ]; then
      return 0
    fi
  fi
  return 1
}

fetch_all_records() {
  local page=1
  local all="[]"

  while true; do
    resp=$(curl -s -H "$auth_header" "${API}?per_page=100&page=${page}")
    records=$(echo "$resp" | jq '.result')
    count=$(echo "$records" | jq 'length')

    if [ "$count" -eq 0 ]; then
      break
    fi

    all=$(echo "$all" "$records" | jq -s '.[0] + .[1]')
    page=$((page + 1))
  done

  echo "$all"
}

save() {
  echo "fetching all dns records for zone ${ZONE_ID}..."
  records=$(fetch_all_records)
  count=$(echo "$records" | jq 'length')
  echo "$records" | jq '.' > "$RECORDS_FILE"
  echo "saved ${count} records to ${RECORDS_FILE}"
}

delete() {
  if [ ! -f "$RECORDS_FILE" ]; then
    echo "error: no saved records found at ${RECORDS_FILE}" >&2
    echo "run 'save' first" >&2
    exit 1
  fi

  local dry_run=false
  if [ "${2:-}" = "--dry-run" ]; then
    dry_run=true
    echo "=== dry run ==="
  fi

  local total skipped deleted failed
  total=$(jq 'length' "$RECORDS_FILE")
  skipped=0; deleted=0; failed=0

  jq -c '.[]' "$RECORDS_FILE" | while read -r record; do
    id=$(echo "$record" | jq -r '.id')
    name=$(echo "$record" | jq -r '.name')
    type=$(echo "$record" | jq -r '.type')

    if is_preserved "$name" "$type"; then
      echo "  skip  ${type} ${name}"
      continue
    fi

    if [ "$dry_run" = true ]; then
      echo "  would delete ${type} ${name}"
      continue
    fi

    resp=$(curl -s -X DELETE -H "$auth_header" "${API}/${id}")
    ok=$(echo "$resp" | jq -r '.success')
    if [ "$ok" = "true" ]; then
      echo "  del   ${type} ${name}"
    else
      err=$(echo "$resp" | jq -c '.errors')
      echo "  FAIL  ${type} ${name}: ${err}" >&2
    fi
  done

  echo "done (total: ${total})"
}

restore() {
  if [ ! -f "$RECORDS_FILE" ]; then
    echo "error: no saved records found at ${RECORDS_FILE}" >&2
    exit 1
  fi

  local count
  count=$(jq 'length' "$RECORDS_FILE")
  echo "restoring ${count} records..."

  jq -c '.[]' "$RECORDS_FILE" | while read -r record; do
    type=$(echo "$record" | jq -r '.type')
    name=$(echo "$record" | jq -r '.name')
    proxied=$(echo "$record" | jq -r '.proxied')
    ttl=$(echo "$record" | jq -r '.ttl')

    # skip preserved records — they were never deleted
    if is_preserved "$name" "$type"; then
      echo "  skip  ${type} ${name} (still exists)"
      continue
    fi

    # build payload based on record type
    if [ "$type" = "MX" ]; then
      priority=$(echo "$record" | jq -r '.priority')
      content=$(echo "$record" | jq -r '.content')
      payload=$(jq -n --arg type "$type" --arg name "$name" --arg content "$content" \
        --argjson priority "$priority" --argjson proxied "$proxied" --argjson ttl "$ttl" \
        '{type: $type, name: $name, content: $content, priority: $priority, proxied: $proxied, ttl: $ttl}')
    elif [ "$type" = "CAA" ] || [ "$type" = "SRV" ]; then
      data=$(echo "$record" | jq '.data')
      payload=$(jq -n --arg type "$type" --arg name "$name" --argjson data "$data" \
        --argjson proxied "$proxied" --argjson ttl "$ttl" \
        '{type: $type, name: $name, data: $data, proxied: $proxied, ttl: $ttl}')
    else
      content=$(echo "$record" | jq -r '.content')
      payload=$(jq -n --arg type "$type" --arg name "$name" --arg content "$content" \
        --argjson proxied "$proxied" --argjson ttl "$ttl" \
        '{type: $type, name: $name, content: $content, proxied: $proxied, ttl: $ttl}')
    fi

    resp=$(curl -s -X POST -H "$auth_header" -H "Content-Type: application/json" \
      -d "$payload" "$API")
    ok=$(echo "$resp" | jq -r '.success')
    if [ "$ok" = "true" ]; then
      echo "  ok    ${type} ${name}"
    else
      err=$(echo "$resp" | jq -c '.errors')
      echo "  FAIL  ${type} ${name}: ${err}" >&2
    fi
  done

  echo "done"
}

cmd="${1:-}"
case "$cmd" in
  save)    save ;;
  delete)  delete "$@" ;;
  restore) restore ;;
  *)
    echo "usage: $0 {save|delete [--dry-run]|restore}" >&2
    exit 1
    ;;
esac
