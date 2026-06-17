# WizPay Nano

WizPay Nano is a paid swap and payroll execution-planning service for AI treasury agents on Arc Testnet.

Agents choose `tokenIn`, `tokenOut`, `amountIn`, `recipient`, and optional `slippageBps`. WizPay Nano quotes through `XyloRouter`, validates `WizPaySwapExecutor` onchain state, and returns approval details plus encoded `executeSwap(...)` calldata for the agent wallet to execute directly.

The backend charges a 0.003 USDC service fee for paid prepare endpoints. It does not custody user funds, does not decide swap or payroll amounts, does not sign transactions, and does not deploy contracts.

## MVP Scope

- Supported swap tokens: USDC and EURC, in either direction.
- Supported payroll tokens: USDC and EURC for planning and paid execution preparation.
- Unsupported: USYC, backend payroll execution, new contracts, backend swap execution.
- Primary payment path: Circle CLI / x402-compatible service payment.
- Local demo fallback: a real Arc Testnet USDC transfer proven with `X-PAYMENT: <txHash>`.

## Verified Arc Testnet MVP Run

The MVP vertical slice has been verified end-to-end on Arc Testnet: the agent checks services and contracts, requests a dynamic quote, sees `402 Payment Required` before payment, pays the 0.003 USDC service fee, retries `/swap/prepare` with `X-PAYMENT`, approves `tokenIn` to `WizPaySwapExecutor`, executes through `WizPaySwapExecutor` + `XyloRouter`, and confirms balances onchain.

Proof transactions:

- Service fee tx: https://testnet.arcscan.app/tx/0x6ba878c0f83d5ea763a810ce55154f86f93ff9562b233c7224351e1cb539316b
- Approve tx: https://testnet.arcscan.app/tx/0x30961fd71fea75ed61a96b68ffdab09bb0815db151ff30ed03682f3ba900f0b2
- Swap execution tx: https://testnet.arcscan.app/tx/0xa9f27f981910693728bb337c179b80e5cddd841fdd2ac7a63a8ed0b3f542fccd

Scope:

- MVP uses `WizPaySwapExecutor` + `XyloRouter`.
- Supported tokens: USDC and EURC.
- No USYC in MVP.
- Payroll prepare returns approval and `batchRouteAndPay(...)` execution data only; no payroll execution is performed by the backend.
- No backend custody.
- Agent/user chooses token pair and amount.
- Circle CLI is the primary agent-side wallet/payment path.
- `X-PAYMENT` tx hash fallback is a real onchain local/dev path, not a mock.

## Endpoints

| Method | Path | Payment | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Free | Project metadata and links |
| `GET` | `/health` | Free | Server health |
| `GET` | `/services` | Free | Agent-readable service manifest |
| `GET` | `/contracts/status` | Free | Live Arc Testnet executor/router status |
| `POST` | `/swap/quote` | Free | Quote USDC/EURC or EURC/USDC for an agent amount |
| `POST` | `/swap/prepare` | 0.003 USDC | Validate and return executable calldata |
| `POST` | `/payroll/plan` | Free | Validate and split payroll payouts into planner batches |
| `POST` | `/payroll/prepare` | 0.003 USDC | Return payroll approval plus batch calldata/CLI commands |

## Local Dev

```bash
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default.

Run checks:

```bash
npm run typecheck
npm run build
```

## Example Requests

Quote:

```bash
curl -s http://localhost:3000/swap/quote \
  -H 'content-type: application/json' \
  -d '{"tokenIn":"USDC","tokenOut":"EURC","amountIn":"1"}'
```

Prepare without payment returns `402 Payment Required`:

```bash
curl -i http://localhost:3000/swap/prepare \
  -H 'content-type: application/json' \
  -d '{"tokenIn":"USDC","tokenOut":"EURC","amountIn":"1","recipient":"0x0000000000000000000000000000000000000001"}'
```

For local real-chain fallback only, send a USDC service-fee transfer to `SERVICE_FEE_COLLECTOR`, then retry:

```bash
curl -s http://localhost:3000/swap/prepare \
  -H 'content-type: application/json' \
  -H 'X-PAYMENT: 0x...' \
  -d '{"tokenIn":"USDC","tokenOut":"EURC","amountIn":"1","recipient":"0x0000000000000000000000000000000000000001"}'
```

Payroll plan:

```bash
curl -s http://localhost:3000/payroll/plan \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "example-agent-reference-001",
    "slippageBps": 100,
    "payouts": [
      {
        "recipient": "0x0000000000000000000000000000000000000001",
        "tokenOut": "USDC",
        "amountIn": "1.25"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000002",
        "tokenOut": "EURC",
        "amountIn": "2.50"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000003",
        "tokenOut": "EURC",
        "amountIn": "3.75"
      }
    ]
  }'
```

The addresses and amounts above are examples only. Agents must provide real recipients, amounts, and reference IDs.

Payroll prepare without payment returns `402 Payment Required`:

```bash
curl -i http://localhost:3000/payroll/prepare \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "example-agent-reference-002",
    "payer": "0x0000000000000000000000000000000000000009",
    "slippageBps": 100,
    "payouts": [
      {
        "recipient": "0x0000000000000000000000000000000000000001",
        "tokenOut": "USDC",
        "amountIn": "1.25"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000002",
        "tokenOut": "EURC",
        "amountIn": "2.50"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000003",
        "tokenOut": "EURC",
        "amountIn": "3.75"
      }
    ]
  }'
```

Pay the current service fee, then retry with `X-PAYMENT`:

```bash
circle wallet transfer 0x32F251fc36A1174901124589EAC2d4E391816F69 \
  --amount 0.003 \
  --address <PAYER_WALLET_ADDRESS> \
  --chain ARC-TESTNET \
  --token 0x3600000000000000000000000000000000000000
```

```bash
curl -s http://localhost:3000/payroll/prepare \
  -H 'content-type: application/json' \
  -H 'X-PAYMENT: <SERVICE_FEE_TX_HASH>' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "example-agent-reference-002",
    "payer": "<PAYER_WALLET_ADDRESS>",
    "slippageBps": 100,
    "payouts": [
      {
        "recipient": "0x0000000000000000000000000000000000000001",
        "tokenOut": "USDC",
        "amountIn": "1.25"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000002",
        "tokenOut": "EURC",
        "amountIn": "2.50"
      },
      {
        "recipient": "0x0000000000000000000000000000000000000003",
        "tokenOut": "EURC",
        "amountIn": "3.75"
      }
    ]
  }'
```

The paid response includes a token approval command, dynamic batch count, per-batch calldata, per-batch Circle CLI commands, and `minAmountsOut` computed from live payroll router estimates plus slippage. Each service-fee tx hash unlocks one prepare response; replaying the same `X-PAYMENT` hash is rejected by the same payment verifier used for `/swap/prepare`.

## Payroll Module Roadmap

- Stage 1: read-only payroll contract inspector and dynamic payroll batch planner.
- Stage 2: paid `/payroll/prepare` that returns execution data for an agent wallet.
- Stage 3: payroll agent script for Circle CLI / agent wallet flows.
- No hardcoded screenshot values; screenshots are UX/proof references only.
- Batch limit: 50 recipients per transaction.
- Service fee currently reuses `SERVICE_FEE_USDC=0.003`.
- Backend does not custody payroll funds, sign payroll transactions, or execute payroll calls.

## Treasury Agent

```bash
npm run agent:treasury -- \
  --tokenIn=USDC \
  --tokenOut=EURC \
  --amountIn=1 \
  --recipient=0x0000000000000000000000000000000000000001
```

The example defaults are local conveniences only. They are not protocol constraints.

For tx-hash fallback retries:

```bash
PAYMENT_MODE=txhash X_PAYMENT=0x... npm run agent:treasury -- --tokenIn=EURC --tokenOut=USDC --amountIn=1 --recipient=0x...
```

## Contracts

- Arc Testnet RPC: `https://rpc.testnet.arc.network`
- Arc Testnet chain ID: `5042002`
- Arcscan: `https://testnet.arcscan.app`
- `WizPaySwapExecutor`: `0x17685466759f9Cde06f0DCbB5464164ABe541eFA`
- `XyloRouter`: `0x73742278c31a76dBb0D2587d03ef92E6E2141023`
- `WizPay Payroll Router`: `0x87ACE45582f45cC81AC1E627E875AE84cbd75946`
- `USDC`: `0x3600000000000000000000000000000000000000`
- `EURC`: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`
- Service fee collector: `0x32F251fc36A1174901124589EAC2d4E391816F69`

## License

MIT
