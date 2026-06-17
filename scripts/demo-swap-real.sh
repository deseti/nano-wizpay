#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${WIZPAY_API_BASE_URL:-http://localhost:3000}"
AGENT_WALLET="${WIZPAY_AGENT_WALLET:-0xa9914Bca9123BA0079bE8c968f632c0dB6400FE7}"
SERVICE_FEE_COLLECTOR="${WIZPAY_SERVICE_FEE_COLLECTOR:-0x32F251fc36A1174901124589EAC2d4E391816F69}"
USDC_TOKEN="${WIZPAY_USDC_TOKEN:-0x3600000000000000000000000000000000000000}"
ARC_EXPLORER="${WIZPAY_ARCSCAN_URL:-https://testnet.arcscan.app}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

extract_tx_hash() {
  node - "$1" <<'NODE'
const fs = require("fs");
const text = fs.readFileSync(process.argv[2], "utf8");
const start = text.indexOf("{");
const end = text.lastIndexOf("}");

if (start === -1 || end === -1 || end < start) {
  process.exit(0);
}

const jsonText = text.slice(start, end + 1);

try {
  const data = JSON.parse(jsonText);
  console.log(data.txHash || "");
} catch {
  const match = text.match(/"txHash"\s*:\s*"(0x[a-fA-F0-9]{64})"/);
  console.log(match ? match[1] : "");
}
NODE
}

run_and_capture_tx() {
  local label="$1"
  local command="$2"
  local output_file="$TMP_DIR/${label// /_}.log"

  echo >&2
  echo "== $label ==" >&2
  echo "$command" >&2
  bash -lc "$command" 2>&1 | tee "$output_file" >&2

  local tx_hash
  tx_hash="$(extract_tx_hash "$output_file")"
  if [[ -z "$tx_hash" ]]; then
    echo "Could not find a transaction hash in Circle CLI output for: $label" >&2
    exit 1
  fi

  echo "$tx_hash"
}

require_command curl
require_command node
require_command circle

cat <<EOF
WARNING: this script executes real Arc Testnet transactions with Circle CLI.
It will spend testnet funds and network fees from:
  $AGENT_WALLET

Backend API:
  $API_BASE_URL

The backend will not sign or execute transactions. Circle CLI executes from your wallet session.
EOF

read -r -p "Type RUN to continue: " CONFIRM
if [[ "$CONFIRM" != "RUN" ]]; then
  echo "Aborted."
  exit 0
fi

SWAP_BODY="$TMP_DIR/swap-body.json"
PREPARE_RESPONSE="$TMP_DIR/swap-prepare.json"

node - "$SWAP_BODY" "$AGENT_WALLET" <<'NODE'
const fs = require("fs");
const [path, recipient] = process.argv.slice(2);
fs.writeFileSync(path, JSON.stringify({
  tokenIn: "EURC",
  tokenOut: "USDC",
  amountIn: "0.01",
  recipient,
  slippageBps: 100
}));
NODE

SERVICE_FEE_TX="$(
  run_and_capture_tx \
    "swap service fee" \
    "circle wallet transfer $SERVICE_FEE_COLLECTOR --amount 0.003 --address $AGENT_WALLET --chain ARC-TESTNET --token $USDC_TOKEN"
)"

echo
echo "== /swap/prepare =="
curl -fsS "$API_BASE_URL/swap/prepare" \
  -H "content-type: application/json" \
  -H "X-PAYMENT: $SERVICE_FEE_TX" \
  --data-binary "@$SWAP_BODY" \
  -o "$PREPARE_RESPONSE"
node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(JSON.stringify({service:j.service, executor:j.executor, router:j.router, amountIn:j.amountIn, minAmountOut:j.minAmountOut}, null, 2));' "$PREPARE_RESPONSE"

APPROVE_COMMAND="$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.circleCli?.approveCommand || "");' "$PREPARE_RESPONSE")"
SWAP_COMMAND="$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.circleCli?.executeSwapCommand || "");' "$PREPARE_RESPONSE")"

if [[ -z "$APPROVE_COMMAND" || -z "$SWAP_COMMAND" ]]; then
  echo "Prepare response did not include expected swap commands." >&2
  cat "$PREPARE_RESPONSE"
  exit 1
fi

APPROVE_TX="$(run_and_capture_tx "swap approve" "$APPROVE_COMMAND")"
SWAP_TX="$(run_and_capture_tx "execute swap" "$SWAP_COMMAND")"

cat <<EOF

== Arcscan Links ==
Service fee: $ARC_EXPLORER/tx/$SERVICE_FEE_TX
Approve:     $ARC_EXPLORER/tx/$APPROVE_TX
Swap:        $ARC_EXPLORER/tx/$SWAP_TX
EOF
