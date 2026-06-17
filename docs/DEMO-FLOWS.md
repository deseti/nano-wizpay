# Nano WizPay Demo Flows

Nano WizPay is a non-custodial paid orchestration API for autonomous agents on Arc Testnet. The API server validates intent, reads contract state, returns quotes, gates paid prepare endpoints behind a USDC service fee, and returns execution plans, calldata, and Circle CLI commands.

The API server runs locally, usually at `http://localhost:3000`. The contracts, token transfers, approvals, swaps, and payroll payouts run on Arc Testnet. The backend never signs transactions, never executes user transactions, never stores private keys, and never custodies user funds. The agent or user wallet executes the returned commands.

## Execution Model

1. The agent calls a free planning or quote endpoint.
2. The agent pays the Nano WizPay service fee on Arc Testnet.
3. The agent retries a paid prepare endpoint with `X-PAYMENT: <txHash>`.
4. Nano WizPay verifies the service-fee transfer and returns commands/calldata.
5. The agent wallet approves token spend and executes the returned contract call.

The backend does not send the approval, swap, payroll batch, or payroll payout transactions.

## Swap Demo

The proven swap path uses `WizPaySwapExecutor` and works end-to-end with Circle CLI scalar arguments.

Flow:

1. Pay the service fee to the Nano WizPay fee collector.
2. Call `POST /swap/prepare` with `X-PAYMENT`.
3. Execute the returned `circleCli.approveCommand`.
4. Execute the returned `circleCli.executeSwapCommand`.
5. Confirm the service fee, approval, and swap on Arcscan.

The official script is:

```bash
bash scripts/demo-swap-real.sh
```

Default demo intent: swap `0.01` EURC to USDC for the demo wallet on Arc Testnet.

## Payroll Demo

The payroll prepare API still returns the primary batch plan and `batches[].calldata` for SDK, frontend, or raw calldata executors. Circle CLI currently works reliably with scalar ABI arguments such as `approve`, `executeSwap`, and `routeAndPay`, but may fail estimation or execution for overloaded array-based functions such as `batchRouteAndPay(...)`.

For Circle CLI payroll demos, use `circleCliFallback.commands` from `POST /payroll/prepare`. Each fallback command maps exactly one payout to:

```text
routeAndPay(address,address,uint256,uint256,address)
```

Flow:

1. Pay the service fee to the Nano WizPay fee collector.
2. Call `POST /payroll/prepare` with `X-PAYMENT`.
3. Execute the returned `approval.circleCliCommand`.
4. Execute each `circleCliFallback.commands[].circleCliCommand`.
5. Confirm the service fee, approval, and each payout on Arcscan.

The official script is:

```bash
bash scripts/demo-payroll-fallback-real.sh
```

Default demo intent: three tiny `0.001` USDC payroll payouts from the demo wallet on Arc Testnet.

## Real Arcscan Proof

| Flow | Step | Arcscan |
| --- | --- | --- |
| Swap | Service fee | https://testnet.arcscan.app/tx/0xfc6355aebbb1622661202b3aa8955d863ca81e197d3f0e7f7fcf1fbec0d27b12 |
| Swap | Approve | https://testnet.arcscan.app/tx/0xd2c0f46016eedb9603488cd6126420b53bf6ad9660e6262462cd7d4d13a43c11 |
| Swap | WizPaySwapExecutor swap | https://testnet.arcscan.app/tx/0x1a8df7e5ef4fc04b4a859e784067ce470886498a1673882af60be97d506ac9f8 |
| Payroll | Service fee | https://testnet.arcscan.app/tx/0xab1b9b62b8cbfc43c3a91fcd8571e75273128fef56ed46c05176d1ba073327ac |
| Payroll | Approve | https://testnet.arcscan.app/tx/0xd6b8739f6980aff40cd5ee1bf8343e7ecc3598ed9bcd991c85234b2af61a23ef |
| Payroll | Payout 1 | https://testnet.arcscan.app/tx/0x1cc0c8e5173cc9782d255d953594e136c58337b2ca437f6890bfe22782fe14d6 |
| Payroll | Payout 2 | https://testnet.arcscan.app/tx/0x15aa1dcced9720df77219174c130229162882d4e94abf3d0f4204558dc869560 |
| Payroll | Payout 3 | https://testnet.arcscan.app/tx/0xa311ec6a9da90ff167d93b7f3fac995ed8817e881e41e885ff787d6b17bc53b1 |

## Security Notes

- Nano WizPay is non-custodial.
- The backend never stores private keys.
- The backend never signs transactions.
- The backend never executes user swaps or payroll payouts.
- The backend only verifies service-fee payment proofs and returns plans, calldata, and commands.
- Circle CLI commands are executed by the agent/user wallet outside the backend.
- Batch payroll calldata remains available for SDK/frontend executors; Circle CLI demos use scalar `routeAndPay` fallback commands because of array/overload limitations.
