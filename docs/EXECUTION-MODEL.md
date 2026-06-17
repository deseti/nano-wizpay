# Execution Model

Nano WizPay separates local API orchestration from onchain execution.

## API Servers

Production API:

```text
https://api.wizpay.xyz
```

During local development, the Nano WizPay API server runs on:

```text
http://localhost:3000
```

The API server validates requests, reads Arc Testnet contract state, calculates quotes and plans, verifies service-fee payment proofs, and returns execution plans.

Public endpoints:

- `GET /services`
- `GET /contracts/status`
- `POST /swap/quote`
- `POST /swap/prepare`
- `POST /payroll/plan`
- `POST /payroll/prepare`

## Arc Testnet Contracts

Smart contracts and token balances live on Arc Testnet. A local HTTP request to Nano WizPay does not by itself create an Arc Testnet transaction.

Onchain state changes happen only when the agent/user wallet submits a transaction, such as:

- `approve(address,uint256)`,
- `executeSwap(...)`,
- `routeAndPay(...)`,
- raw calldata execution from an SDK or frontend.

## Free Read-Only Endpoints

`POST /swap/quote` and `POST /payroll/plan` are free because they only quote, validate, estimate, and plan. They do not unlock executable transaction plans and they do not mutate chain state.

## Paid Prepare Endpoints

`POST /swap/prepare` and `POST /payroll/prepare` require a 402-style service fee. The current fee is:

```text
0.003 USDC
```

The agent pays the service fee to:

```text
0x32F251fc36A1174901124589EAC2d4E391816F69
```

Then the agent retries the prepare request with:

```text
X-PAYMENT: <service-fee-tx-hash>
```

Nano WizPay verifies the Arc Testnet USDC transfer before returning the paid execution plan.

## Wallet Execution

The paid prepare response includes calldata and Circle CLI commands. The agent/user wallet decides whether to execute them. For example:

- swap prepare returns approval and `executeSwap(...)` commands,
- payroll prepare returns approval, batch calldata, batch commands, and scalar fallback `routeAndPay(...)` commands.

The backend never sends these transactions.

## Security Model

Nano WizPay is non-custodial:

- no backend custody,
- no private key storage,
- no backend signing,
- no backend transaction execution,
- no backend control over user funds.

The backend returns plans and proofs. The agent/user wallet executes transactions independently.
