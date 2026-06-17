# WizPay Nano Demo

This is a concise recording script for the verified Arc Testnet MVP flow.

## Prerequisites

- Node.js
- Circle CLI installed
- Circle CLI logged into testnet
- Agent wallet funded on `ARC-TESTNET`

## 1. Start Server

```bash
npm run dev
```

## 2. Check Services

```bash
curl -s http://localhost:3000/services | python3 -m json.tool
```

## 3. Check Contracts

```bash
curl -s http://localhost:3000/contracts/status | python3 -m json.tool
```

The response includes the verified swap executor/router status and a read-only `payroll` section for the WizPay Payroll Router.

## 4. Quote Example

EURC -> USDC with amount `1` is an example only. The API accepts agent-provided `tokenIn`, `tokenOut`, `amountIn`, `recipient`, and `slippageBps`.

```bash
curl -s http://localhost:3000/swap/quote \
  -H 'content-type: application/json' \
  -d '{"tokenIn":"EURC","tokenOut":"USDC","amountIn":"1"}' | python3 -m json.tool
```

## 5. Prepare Unpaid

This returns `402 Payment Required`.

```bash
curl -i http://localhost:3000/swap/prepare \
  -H 'content-type: application/json' \
  -d '{"tokenIn":"EURC","tokenOut":"USDC","amountIn":"1","recipient":"<AGENT_WALLET_ADDRESS>","slippageBps":100}'
```

## 6. Pay Service Fee Fallback

```bash
circle wallet transfer 0x32F251fc36A1174901124589EAC2d4E391816F69 --amount 0.003 --address <AGENT_WALLET_ADDRESS> --chain ARC-TESTNET --token 0x3600000000000000000000000000000000000000
```

## 7. Retry Prepare With X-PAYMENT

```bash
curl -s http://localhost:3000/swap/prepare \
  -H 'content-type: application/json' \
  -H 'X-PAYMENT: <SERVICE_FEE_TX_HASH>' \
  -d '{"tokenIn":"EURC","tokenOut":"USDC","amountIn":"1","recipient":"<AGENT_WALLET_ADDRESS>","slippageBps":100}' | python3 -m json.tool
```

## 8. Approve Token

Use the `circleCli.approveCommand` value from the paid `/swap/prepare` response.

## 9. Execute Swap

Use the `circleCli.executeSwapCommand` value from the paid `/swap/prepare` response.

## 10. Check Balance

```bash
circle wallet balance --address <AGENT_WALLET_ADDRESS> --chain ARC-TESTNET
```

## Payroll Stage 1 Planner

This endpoint is free and planner-only. It validates dynamic agent-provided payroll intent data, splits payouts into batches of at most 50 recipients, may include read-only estimates, and does not return calldata or execute transactions.

```bash
curl -s http://localhost:3000/payroll/plan \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "demo-agent-reference-001",
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
  }' | python3 -m json.tool
```

The recipients, amounts, and reference ID above are examples only.

## Payroll Module Roadmap

- Stage 1: inspector + planner.
- Stage 2: paid `/payroll/prepare`.
- Stage 3: payroll agent script.
- No hardcoded screenshot values.
- Batch limit: 50 recipients per transaction.
- Service fee currently reuses `SERVICE_FEE_USDC=0.003`.
- No backend custody, backend signing, or backend payroll execution.

## Payroll Stage 2 Prepare

This endpoint returns `402 Payment Required` until the agent pays the service fee and retries with `X-PAYMENT`. The paid response contains a token approval command, dynamic batch count, calldata per batch, one Circle CLI command per batch, and scalar `routeAndPay(...)` fallback commands per payout.

```bash
curl -i http://localhost:3000/payroll/prepare \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "demo-agent-reference-002",
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

Pay the fee:

```bash
circle wallet transfer 0x32F251fc36A1174901124589EAC2d4E391816F69 --amount 0.003 --address <PAYER_WALLET_ADDRESS> --chain ARC-TESTNET --token 0x3600000000000000000000000000000000000000
```

Retry:

```bash
curl -s http://localhost:3000/payroll/prepare \
  -H 'content-type: application/json' \
  -H 'X-PAYMENT: <SERVICE_FEE_TX_HASH>' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "demo-agent-reference-002",
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
  }' | python3 -m json.tool
```

Use `approval.circleCliCommand`, then use either SDK/frontend batch execution from `batches[].calldata` or Circle CLI fallback commands from `circleCliFallback.commands`. Replaying the same `X-PAYMENT` tx hash should not unlock another prepare response.

### Circle CLI Fallback

Circle CLI can have trouble estimating overloaded functions with array arguments for `batchRouteAndPay(...)`. Nano WizPay still generates the batch plan and calldata as the primary SDK/frontend path, but it also returns one scalar `routeAndPay(address,address,uint256,uint256,address)` command per payout for Circle CLI compatibility.

The scalar fallback uses the same `getBatchEstimatedOutputs(...)` results and slippage-derived `minAmountOut` values as the batch plan. `minAmountOut` is not set to zero.

Verified scalar fallback proof:

- Payroll `routeAndPay` success tx: https://testnet.arcscan.app/tx/0x536d83f722873e003191de7cdccd4fb075168be1aeb2fc073c8ae406bfa84878

Do not overclaim Circle CLI batch execution as verified. Batch plan/calldata is generated; scalar fallback has been verified with Circle CLI.

## Payroll DRY_RUN Agent

The dry-run agent communicates with Nano WizPay through HTTP API calls only. It prints the next actions for a human or agent wallet and does not execute transactions.

Run without a payment tx hash:

```bash
WIZPAY_API_BASE_URL=http://localhost:3001 \
PAYROLL_PAYER_ADDRESS=<PAYER_WALLET_ADDRESS> \
PAYROLL_DEMO_RECIPIENT=<DEMO_RECIPIENT_ADDRESS> \
npm run agent:payroll
```

Expected flow:

- Calls `/payroll/plan`.
- Calls `/payroll/prepare` without `X-PAYMENT`.
- Receives `402 Payment Required`.
- Prints the service-fee command and stops.

Run after paying the service fee:

```bash
WIZPAY_API_BASE_URL=http://localhost:3001 \
PAYROLL_PAYER_ADDRESS=<PAYER_WALLET_ADDRESS> \
PAYROLL_PAYMENT_TX_HASH=<SERVICE_FEE_TX_HASH> \
npm run agent:payroll
```

Expected flow:

- Retries `/payroll/prepare` with `X-PAYMENT`.
- Prints the approval command.
- Prints each `batchRouteAndPay(...)` command and calldata length.
- Prints fallback `routeAndPay(...)` commands for Circle CLI array-argument compatibility.
- Does not run any Circle CLI command.

Set `PAYROLL_INTENT_JSON` to override the generated 3-payout local demo intent. The sample stays small, uses a dynamic reference ID, does not use USYC, and derives batching from the API response.

## Proof Transactions

- Service fee tx: https://testnet.arcscan.app/tx/0x6ba878c0f83d5ea763a810ce55154f86f93ff9562b233c7224351e1cb539316b
- Approve tx: https://testnet.arcscan.app/tx/0x30961fd71fea75ed61a96b68ffdab09bb0815db151ff30ed03682f3ba900f0b2
- Swap execution tx: https://testnet.arcscan.app/tx/0xa9f27f981910693728bb337c179b80e5cddd841fdd2ac7a63a8ed0b3f542fccd
- Payroll routeAndPay fallback tx: https://testnet.arcscan.app/tx/0x536d83f722873e003191de7cdccd4fb075168be1aeb2fc073c8ae406bfa84878

## Note

EURC -> USDC and amount `1` are demo examples only. The API accepts agent-provided `tokenIn`, `tokenOut`, `amountIn`, `recipient`, and `slippageBps`.
