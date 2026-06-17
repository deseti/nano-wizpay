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

## Real Transaction Requirement

`/services`, `/contracts/status`, `/swap/quote`, and `/payroll/plan` require no wallet executor. `/swap/prepare` and `/payroll/prepare` return `PAYMENT_REQUIRED` until the `0.003` USDC service fee is paid.

Real onchain execution requires a wallet executor because Nano WizPay is non-custodial. Supported executor options include Circle CLI, Circle SDK/API, a viem or ethers signer, a smart account SDK, or a frontend wallet connector. The official end-to-end demo path in this repo uses Circle CLI as the wallet executor.

Without a wallet executor, an agent can prepare transactions but cannot move funds onchain by only calling `https://api.wizpay.xyz`.

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
