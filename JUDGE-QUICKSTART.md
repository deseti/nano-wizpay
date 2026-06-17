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
