# Judge Quickstart

Nano WizPay is already deployed at:

```text
https://api.wizpay.xyz
```

Judges can test the read-only API calls below without cloning, installing, or running anything. These endpoints do not require a wallet executor:

- `GET /services`
- `GET /contracts/status`
- `POST /swap/quote`
- `POST /payroll/plan`

Paid prepare endpoints return `PAYMENT_REQUIRED` until the `0.003` USDC service fee is paid:

- `POST /swap/prepare`
- `POST /payroll/prepare`

Real onchain execution requires a wallet executor because Nano WizPay is non-custodial. The backend does not sign transactions, does not store private keys, does not custody funds, and does not move funds onchain. Without a wallet executor, an agent can prepare transactions but cannot execute them.

Supported executor options include Circle CLI, Circle SDK/API, a viem or ethers signer, a smart account SDK, or a frontend wallet connector. The official end-to-end demo path in this repo uses Circle CLI as the wallet executor.

## Prerequisites

Read-only API checks:

- No repo clone, install, or local server is required.
- Recommended tools: `curl` and `jq`.

Local development:

- Node.js 20 or newer.
- `npm`.
- `git`.
- Run `npm install`.
- Run `npm run dev`.

Real transaction demo:

- Real onchain execution requires a wallet executor.
- The official demo executor in this repo is Circle CLI.
- Canteen ARC CLI, used for local/event tooling: `uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git`.
- Circle CLI, used as the official wallet executor: `npm install -g @circle-fin/cli`.
- Circle CLI requires Node.js v20.18.2 or newer.
- Circle CLI must be authenticated and configured.
- Circle CLI must control a funded Arc Testnet wallet.
- The wallet must have relevant testnet token balances such as USDC and EURC.
- Verify the local executor with `circle --version` and `circle wallet --help`.
- Then run `npm run demo:swap-real` and `npm run demo:payroll-real`.

These CLI tools are only needed for local/event tooling and real transaction demos. Judges can still test read-only endpoints and unpaid prepare responses without installing them. Without a wallet executor, Nano WizPay cannot submit real onchain transactions from the judge's machine.

## Read-Only API Checks

Services:

```bash
curl -s https://api.wizpay.xyz/services
```

Contract status:

```bash
curl -s https://api.wizpay.xyz/contracts/status
```

Swap quote:

```bash
curl -s https://api.wizpay.xyz/swap/quote \
  -H 'content-type: application/json' \
  -d '{"tokenIn":"EURC","tokenOut":"USDC","amountIn":"0.01"}'
```

Payroll plan:

```bash
curl -s https://api.wizpay.xyz/payroll/plan \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "USDC",
    "referenceId": "judge-readonly-payroll-plan",
    "slippageBps": 100,
    "payouts": [
      {
        "recipient": "0x1111111111111111111111111111111111111111",
        "tokenOut": "USDC",
        "amountIn": "0.001"
      },
      {
        "recipient": "0x2222222222222222222222222222222222222222",
        "tokenOut": "EURC",
        "amountIn": "0.001"
      },
      {
        "recipient": "0x3333333333333333333333333333333333333333",
        "tokenOut": "EURC",
        "amountIn": "0.001"
      }
    ]
  }'
```

Unpaid swap prepare, expected to return `PAYMENT_REQUIRED`:

```bash
curl -i https://api.wizpay.xyz/swap/prepare \
  -H 'content-type: application/json' \
  -d '{
    "tokenIn": "EURC",
    "tokenOut": "USDC",
    "amountIn": "0.01",
    "recipient": "0x1111111111111111111111111111111111111111",
    "slippageBps": 100
  }'
```

## Real Transaction Demo

The official end-to-end demos require Circle CLI configured with a funded Arc Testnet wallet:

```bash
npm run demo:swap-real
npm run demo:payroll-real
```

These demos use Circle CLI as the wallet executor. They spend Arc Testnet funds/network fees and submit real onchain transactions from the configured wallet.

## Verified Proofs

See [Verified Proofs](docs/PROOFS.md) for the primary judge-facing onchain evidence.

- Latest swap proof: 5 USDC -> 4.251173 EURC received, `executeSwap` tx https://testnet.arcscan.app/tx/0xaa58ede3ce79805c229ab1885efdb480f0addd5137e73dc43213b28a9a0a5e5d.
- Latest payroll proof: `HERMES-PAYROLL-5-REAL-001`, 5 payouts total, 0.005 USDC payroll input, 3 direct USDC payouts, 2 USDC->EURC routed payouts, 0.003 USDC service fee.
