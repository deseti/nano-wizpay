# Nano WizPay Overview

Nano WizPay is a non-custodial paid orchestration API for autonomous agents on Arc Testnet. It gives agents a clean HTTP interface for quoting, planning, payment-gated preparation, calldata generation, and Circle CLI command generation.

Nano WizPay does not replace the agent wallet. The backend prepares the work; the agent or user wallet executes it.

## API URLs

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

## Why Agents Need Paid Orchestration

Autonomous agents need repeatable, machine-readable ways to:

- discover supported services,
- request quotes and payroll plans,
- pay an API service fee,
- receive exact wallet actions,
- execute those actions from their own wallet.

Nano WizPay provides that orchestration layer while keeping token custody and transaction signing outside the backend.

## Planning vs Execution

Quoting and planning endpoints compute what should happen. They do not create onchain transactions.

Execution happens only when the agent wallet submits a transaction to Arc Testnet. Nano WizPay returns calldata and Circle CLI commands, but it does not sign or send those transactions.

## Supported MVP Flows

- Swap: quote and prepare USDC/EURC swaps through `WizPaySwapExecutor` and `XyloRouter`.
- Payroll: plan and prepare payroll payouts through the WizPay Payroll Router.

## Supported Tokens

The MVP supports only:

- USDC: `0x3600000000000000000000000000000000000000`
- EURC: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a`

USYC is not supported in this MVP.

## Main Contracts

| Contract | Address |
| --- | --- |
| WizPaySwapExecutor | `0x17685466759f9Cde06f0DCbB5464164ABe541eFA` |
| XyloRouter | `0x73742278c31a76dBb0D2587d03ef92E6E2141023` |
| WizPay Payroll Router | `0x87ACE45582f45cC81AC1E627E875AE84cbd75946` |
| Service fee collector | `0x32F251fc36A1174901124589EAC2d4E391816F69` |

Current service fee: `0.003` USDC.
