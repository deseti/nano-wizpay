# WizPay Nano

Nano WizPay is a non-custodial paid orchestration API for autonomous agents on Arc Testnet. The local API prepares quotes, plans, calldata, and Circle CLI commands; the agent/user wallet executes transactions.

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
