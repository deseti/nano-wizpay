# WizPay Nano

Nano WizPay is a non-custodial paid orchestration API for autonomous agents on Arc Testnet. The local API prepares quotes, plans, calldata, and Circle CLI commands; the agent/user wallet executes transactions.

## Judge Quickstart

Nano WizPay is already deployed at:

```text
https://api.wizpay.xyz
```

Judges can test read-only API calls without cloning, installing, or running anything. See [JUDGE-QUICKSTART.md](JUDGE-QUICKSTART.md) for copy-paste `curl` examples for:

- `GET /services`
- `GET /contracts/status`
- `POST /swap/quote`
- `POST /payroll/plan`
- unpaid `POST /swap/prepare`, which should return `PAYMENT_REQUIRED`

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

## Real Transaction Requirement

`/services`, `/contracts/status`, `/swap/quote`, and `/payroll/plan` require no wallet executor. `/swap/prepare` and `/payroll/prepare` return `PAYMENT_REQUIRED` until the `0.003` USDC service fee is paid.

Real onchain execution requires a wallet executor because Nano WizPay is non-custodial. Supported executor options include Circle CLI, Circle SDK/API, a viem or ethers signer, a smart account SDK, or a frontend wallet connector. The official end-to-end demo path in this repo uses Circle CLI as the wallet executor.

Without a wallet executor, an agent can prepare transactions but cannot move funds onchain by only calling `https://api.wizpay.xyz`.

## Latest Real Onchain Proofs

The primary judge-facing proofs are in [Verified Proofs](docs/PROOFS.md). They were executed by a local Hermes agent using Circle CLI as the wallet executor and `api.wizpay.xyz` as the production orchestration API.

- 5 USDC -> EURC swap: `executeSwap` tx https://testnet.arcscan.app/tx/0xaa58ede3ce79805c229ab1885efdb480f0addd5137e73dc43213b28a9a0a5e5d.
- 5-recipient payroll: `HERMES-PAYROLL-5-REAL-001`, five payouts with 3 direct USDC payouts and 2 USDC->EURC routed payouts.

## Quick Start

```bash
cp .env.example .env
npm install
npm run dev
```

Production API:

```text
https://api.wizpay.xyz
```

Local development API:

```text
http://localhost:3000
```

Public endpoints:

- `GET /services`
- `GET /contracts/status`
- `POST /swap/quote`
- `POST /swap/prepare`
- `POST /payroll/plan`
- `POST /payroll/prepare`

## Detailed Documentation

- [Overview](docs/OVERVIEW.md)
- [Execution Model](docs/EXECUTION-MODEL.md)
- [Swap Demo](docs/SWAP-DEMO.md)
- [Payroll Demo](docs/PAYROLL-DEMO.md)
- [Circle CLI Limitations](docs/CIRCLE-CLI-LIMITATIONS.md)
- [Verified Proofs](docs/PROOFS.md)

Additional combined demo notes are available in [Demo Flows](docs/DEMO-FLOWS.md).

## Demo Scripts

These scripts execute real Arc Testnet transactions through Circle CLI and spend testnet funds/network fees.

```bash
npm run demo:swap-real
npm run demo:payroll-real
```

Equivalent direct script commands:

```bash
bash scripts/demo-swap-real.sh
bash scripts/demo-payroll-fallback-real.sh
```

## Development Checks

```bash
npm run typecheck
npm run build
```

## License

MIT
