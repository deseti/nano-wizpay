# Swap Demo

The swap demo proves the paid orchestration path for a real Arc Testnet swap through `WizPaySwapExecutor`.

## Run

```bash
npm run demo:swap-real
```

or:

```bash
bash scripts/demo-swap-real.sh
```

The script warns before spending Arc Testnet funds and network fees.

## What The Script Does

1. Pays the `0.003` USDC service fee.
2. Calls `POST /swap/prepare` with `X-PAYMENT`.
3. Executes `approve(address,uint256)` on EURC with spender `WizPaySwapExecutor`.
4. Executes `executeSwap(...)` on `WizPaySwapExecutor`.
5. Prints Arcscan links for the service fee, approval, and swap.

Default intent:

```text
0.01 EURC -> USDC
```

## Non-Custodial Execution

The backend does not sign or send the swap transaction. Circle CLI signs from the configured agent wallet. Nano WizPay only returns the paid execution plan and commands.

## Latest Real Proof

| Step | Arcscan |
| --- | --- |
| Service fee | https://testnet.arcscan.app/tx/0xfc6355aebbb1622661202b3aa8955d863ca81e197d3f0e7f7fcf1fbec0d27b12 |
| Approve | https://testnet.arcscan.app/tx/0xd2c0f46016eedb9603488cd6126420b53bf6ad9660e6262462cd7d4d13a43c11 |
| Swap | https://testnet.arcscan.app/tx/0x1a8df7e5ef4fc04b4a859e784067ce470886498a1673882af60be97d506ac9f8 |
