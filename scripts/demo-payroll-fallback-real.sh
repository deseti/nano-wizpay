#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${WIZPAY_API_BASE_URL:-http://localhost:3000}"
AGENT_WALLET="${WIZPAY_AGENT_WALLET:-0xa9914Bca9123BA0079bE8c968f632c0dB6400FE7}"
SERVICE_FEE_COLLECTOR="${WIZPAY_SERVICE_FEE_COLLECTOR:-0x32F251fc36A1174901124589EAC2d4E391816F69}"
USDC_TOKEN="${WIZPAY_USDC_TOKEN:-0x3600000000000000000000000000000000000000}"
ARC_EXPLORER="${WIZPAY_ARCSCAN_URL:-https://testnet.arcscan.app}"
RECIPIENT_1="${WIZPAY_PAYROLL_RECIPIENT_1:-0x1111111111111111111111111111111111111111}"
RECIPIENT_2="${WIZPAY_PAYROLL_RECIPIENT_2:-0x2222222222222222222222222222222222222222}"
RECIPIENT_3="${WIZPAY_PAYROLL_RECIPIENT_3:-0x3333333333333333333333333333333333333333}"

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
Payroll uses scalar routeAndPay fallback commands for Circle CLI compatibility.
Funds sent to the demo recipients cannot be recovered unless you control those wallets.
EOF

read -r -p "Type RUN to continue: " CONFIRM
if [[ "$CONFIRM" != "RUN" ]]; then
  echo "Aborted."
  exit 0
fi

PAYROLL_BODY="$TMP_DIR/payroll-body.json"
PREPARE_RESPONSE="$TMP_DIR/payroll-prepare.json"
PAYOUT_TXS="$TMP_DIR/payout-txs.txt"

node - "$PAYROLL_BODY" "$AGENT_WALLET" "$RECIPIENT_1" "$RECIPIENT_2" "$RECIPIENT_3" <<'NODE'
const fs = require("fs");
const [path, payer, r1, r2, r3] = process.argv.slice(2);
fs.writeFileSync(path, JSON.stringify({
  tokenIn: "USDC",
  referenceId: `PAYROLL-REAL-DEMO-${Date.now()}`,
  payer,
  slippageBps: 100,
  payouts: [
    { recipient: r1, tokenOut: "USDC", amountIn: "0.001" },
    { recipient: r2, tokenOut: "EURC", amountIn: "0.001" },
    { recipient: r3, tokenOut: "EURC", amountIn: "0.001" }
  ]
}));
NODE

SERVICE_FEE_TX="$(
  run_and_capture_tx \
    "payroll service fee" \
    "circle wallet transfer $SERVICE_FEE_COLLECTOR --amount 0.003 --address $AGENT_WALLET --chain ARC-TESTNET --token $USDC_TOKEN"
)"

echo
echo "== /payroll/prepare =="
curl -fsS "$API_BASE_URL/payroll/prepare" \
  -H "content-type: application/json" \
  -H "X-PAYMENT: $SERVICE_FEE_TX" \
  --data-binary "@$PAYROLL_BODY" \
  -o "$PREPARE_RESPONSE"
node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(JSON.stringify({service:j.service, batchCount:j.batchCount, fallbackCommandCount:j.circleCliFallback?.commandCount, totalAmountIn:j.totalAmountIn}, null, 2));' "$PREPARE_RESPONSE"

APPROVE_COMMAND="$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.approval?.circleCliCommand || "");' "$PREPARE_RESPONSE")"
if [[ -z "$APPROVE_COMMAND" ]]; then
  echo "Prepare response did not include approval command." >&2
  cat "$PREPARE_RESPONSE"
  exit 1
fi

APPROVE_TX="$(run_and_capture_tx "payroll approve" "$APPROVE_COMMAND")"

node - "$PREPARE_RESPONSE" "$TMP_DIR/fallback-commands.txt" <<'NODE'
const fs = require("fs");
const [responsePath, outputPath] = process.argv.slice(2);
const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));
const commands = response.circleCliFallback?.commands || [];
if (!commands.length) {
  throw new Error("Prepare response did not include circleCliFallback.commands");
}
fs.writeFileSync(outputPath, commands.map((entry) => entry.circleCliCommand).join("\n") + "\n");
NODE

: > "$PAYOUT_TXS"
index=1
while IFS= read -r command; do
  [[ -z "$command" ]] && continue
  tx_hash="$(run_and_capture_tx "payroll payout $index" "$command")"
  echo "$tx_hash" >> "$PAYOUT_TXS"
  index=$((index + 1))
done < "$TMP_DIR/fallback-commands.txt"

cat <<EOF

== Arcscan Links ==
Service fee: $ARC_EXPLORER/tx/$SERVICE_FEE_TX
Approve:     $ARC_EXPLORER/tx/$APPROVE_TX
EOF

index=1
while IFS= read -r tx_hash; do
  echo "Payout $index:   $ARC_EXPLORER/tx/$tx_hash"
  index=$((index + 1))
done < "$PAYOUT_TXS"
