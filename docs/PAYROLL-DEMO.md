# Payroll Demo

The payroll demo proves the paid orchestration path for payroll preparation and Circle CLI-compatible scalar payout execution.

## Run

```bash
npm run demo:payroll-real
```

or:

```bash
bash scripts/demo-payroll-fallback-real.sh
```

The script warns before spending Arc Testnet funds and network fees. It also warns that funds sent to demo recipients cannot be recovered.

## What The Script Does

1. Pays the `0.003` USDC service fee.
2. Calls `POST /payroll/prepare` with `X-PAYMENT`.
3. Executes `approval.circleCliCommand`.
4. Executes each `circleCliFallback.commands[].circleCliCommand`.
5. Prints Arcscan links for the service fee, approval, and every payout.

Default intent:

```text
0.001 USDC -> recipient 1 as USDC
0.001 USDC -> recipient 2 as EURC
0.001 USDC -> recipient 3 as EURC
```

## Why The Fallback Uses routeAndPay

The API still returns batch plan data and `batches[].calldata` for SDK, frontend, or raw calldata executors. For Circle CLI demos, the script uses scalar `routeAndPay(...)` commands because Circle CLI may fail estimation or execution for overloaded array-based `batchRouteAndPay(...)` functions.

From the user's perspective, this is one command/script. Internally, it submits multiple onchain transactions: one service-fee transfer, one approval, and one scalar payout transaction per recipient.

## Latest Real Proof

| Step | Arcscan |
| --- | --- |
| Service fee | https://testnet.arcscan.app/tx/0xab1b9b62b8cbfc43c3a91fcd8571e75273128fef56ed46c05176d1ba073327ac |
| Approve | https://testnet.arcscan.app/tx/0xd6b8739f6980aff40cd5ee1bf8343e7ecc3598ed9bcd991c85234b2af61a23ef |
| Payout 1 | https://testnet.arcscan.app/tx/0x1cc0c8e5173cc9782d255d953594e136c58337b2ca437f6890bfe22782fe14d6 |
| Payout 2 | https://testnet.arcscan.app/tx/0x15aa1dcced9720df77219174c130229162882d4e94abf3d0f4204558dc869560 |
| Payout 3 | https://testnet.arcscan.app/tx/0xa311ec6a9da90ff167d93b7f3fac995ed8817e881e41e885ff787d6b17bc53b1 |
