#!/usr/bin/env bash
# End-to-end check of the docker compose setup: start, sign up, upload a file,
# back up, wipe everything, restore, and log in again (R-11: restores are tested).
# Used by CI; safe to run locally (it destroys the compose volumes!).
set -euo pipefail
cd "$(dirname "$0")"

PORT="${SERVER_PORT:-8080}"
BASE="http://127.0.0.1:$PORT/v1"
rnd() { node -e "console.log(require('crypto').randomBytes($1).toString('base64url'))"; }
uuid() { node -e "const b=require('crypto').randomBytes(16);b[6]=(b[6]&15)|0x70;b[8]=(b[8]&63)|128;const h=b.toString('hex');console.log(h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20))"; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)$1))"; }
wait_health() {
  for _ in $(seq 1 60); do curl -fsS "$BASE/health" > /dev/null 2>&1 && return 0; sleep 2; done
  docker compose logs server | tail -50; return 1
}

docker compose up -d --no-build
wait_health

EMAIL="smoke-$(rnd 4)@example.com"
LOGIN_KEY="$(rnd 32)"
USER_ID="$(uuid)"; ACCOUNT_DOC="$(uuid)"; NOTEBOOK="$(uuid)"; NOTE="$(uuid)"; ATT="$(uuid)"
SESSION=$(curl -fsS "$BASE/auth/signup" -H 'content-type: application/json' -d "{
  \"email\":\"$EMAIL\",\"salt\":\"$(rnd 16)\",\"kdf\":{\"alg\":\"argon2id13\",\"ops\":3,\"mem\":67108864},
  \"loginKey\":\"$LOGIN_KEY\",\"recoveryLoginKey\":\"$(rnd 32)\",
  \"wrappedMasterKeyPassword\":\"$(rnd 73)\",\"wrappedMasterKeyRecovery\":\"$(rnd 73)\",
  \"userId\":\"$USER_ID\",\"accountDocId\":\"$ACCOUNT_DOC\",\"deviceName\":\"smoke\"}")
TOKEN=$(echo "$SESSION" | json .accessToken)
AUTH="authorization: Bearer $TOKEN"
curl -fsS "$BASE/notebooks" -H "$AUTH" -H 'content-type: application/json' \
  -d "{\"notebookId\":\"$NOTEBOOK\",\"mode\":\"private\",\"wrappedKey\":\"$(rnd 73)\"}" > /dev/null
curl -fsS "$BASE/docs" -H "$AUTH" -H 'content-type: application/json' \
  -d "{\"docId\":\"$NOTE\",\"kind\":\"note\",\"notebookId\":\"$NOTEBOOK\"}"
head -c 5000 /dev/urandom > /tmp/ds-chunk
curl -fsS "$BASE/attachments" -H "$AUTH" -H 'content-type: application/json' \
  -d "{\"attachmentId\":\"$ATT\",\"noteId\":\"$NOTE\",\"size\":5000,\"chunkCount\":1,\"mime\":\"application/pdf\"}"
curl -fsS -X PUT "$BASE/attachments/$ATT/chunks/0" -H "$AUTH" -H 'content-type: application/octet-stream' --data-binary @/tmp/ds-chunk

RESTORE_YES=1 ./backup.sh
DUMP=$(ls -t backups/db-*.dump | head -1)
FILES=$(ls -t backups/files-*.tar.gz | head -1)

echo "--- wiping all data"
docker compose down -v
docker compose up -d --no-build postgres
RESTORE_YES=1 ./restore.sh "$DUMP" "$FILES"
wait_health

LOGIN=$(curl -fsS "$BASE/auth/login" -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"loginKey\":\"$LOGIN_KEY\",\"deviceName\":\"after-restore\"}")
TOKEN=$(echo "$LOGIN" | json .accessToken)
curl -fsS "$BASE/attachments/$ATT/chunks/0" -H "authorization: Bearer $TOKEN" -o /tmp/ds-chunk-restored
cmp /tmp/ds-chunk /tmp/ds-chunk-restored
echo "smoke test passed: data and files survived backup → wipe → restore"
