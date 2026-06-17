# Verified Arc Testnet Proofs

This is the primary proof file for Nano WizPay judge review. The latest proofs below were executed by a local Hermes agent using Circle CLI as the wallet executor and `api.wizpay.xyz` as the production orchestration API.

Nano WizPay is non-custodial: it prepared quotes, plans, calldata, and Circle CLI commands; the local wallet executor signed and submitted the real Arc Testnet transactions.

Local/event tooling and real transaction demos use:

```bash
uv tool install git+https://github.com/the-canteen-dev/ARC-cli.git
npm install -g @circle-fin/cli
```

Circle CLI requires Node.js v20.18.2 or newer. These tools are not required for read-only API checks such as `/services`, `/contracts/status`, `/swap/quote`, or `/payroll/plan`.

## Latest Swap Proof: 5 USDC to EURC

Primary judge-facing swap proof.

| Field | Value |
| --- | --- |
| Flow | 5 USDC -> EURC swap |
| Wallet | `0xa9914bca9123ba0079be8c968f632c0db6400fe7` |
| Quote | 5 USDC -> 4.261829 EURC |
| minAmountOut | 4.21921 EURC |
| Actual received | 4.251173 EURC |
| USDC balance | 35.192894 -> 30.189894 (-5.003) |
| EURC balance | 4.373056 -> 8.624229 (+4.251173) |

| Step | Arcscan |
| --- | --- |
| Service fee | https://testnet.arcscan.app/tx/0x58632caae2d2a13724c6e85c5d31ecce548eca0328f8d97946402b468f358897 |
| Approve | https://testnet.arcscan.app/tx/0xc19400a869f2b78a16b468b3432fd3f9b9fff1302e68530f7261dde69d56c3a3 |
| executeSwap | https://testnet.arcscan.app/tx/0xaa58ede3ce79805c229ab1885efdb480f0addd5137e73dc43213b28a9a0a5e5d |

## Latest Payroll Proof: 5-recipient payroll

Primary judge-facing payroll proof.

| Field | Value |
| --- | --- |
| Flow | 5-recipient payroll |
| Reference ID | `HERMES-PAYROLL-5-REAL-001` |
| Payer wallet | `0xa9914bca9123ba0079be8c968f632c0db6400fe7` |
| Total payouts | 5 |
| Payroll input | 0.005 USDC total, using five payouts of 0.001 USDC input each |
| Route mix | 3 direct USDC payouts and 2 USDC->EURC routed payouts |
| Service fee | 0.003 USDC |
| USDC balance | 35.200894 -> 35.192894 (-0.008) |
| EURC balance | 4.373056 -> 4.373056 |

| Step | Arcscan |
| --- | --- |
| Service fee | https://testnet.arcscan.app/tx/0xbe95a87f42e16bb3c59ffa295ca3c99f2ed5ac136fe199283a0fecd365a63655 |
| Approve | https://testnet.arcscan.app/tx/0x3899f11e353738a7cc6301b14a44ee0e508cc8bda3b2e18a806a1e5997a4cde3 |
| Payout 1 | https://testnet.arcscan.app/tx/0x02eef1a5f53fc24d1f935d35ee427e1c66a3c3dfe7cb7068ca625004bdc3366e |
| Payout 2 | https://testnet.arcscan.app/tx/0xe93ba7285bbf83f917dfc4bbacfa04878a02086404f1cc88c6c40ff6e4e24222 |
| Payout 3 | https://testnet.arcscan.app/tx/0x44b462fbb251e0d65e0123efde2aae6bcbd2b80b52129f58846d501f21b2a96a |
| Payout 4 | https://testnet.arcscan.app/tx/0x1ae880b08928c9cc6a290c14340dd035c104da41bd07929a7014df5773b436aa |
| Payout 5 | https://testnet.arcscan.app/tx/0xdfb50aaabcf0d5419426e275fb8a9bf33198e2cfc50530ce0df6af8a5c0adde2 |

## Older Proofs

These earlier verified demo transactions are retained for continuity. The latest swap and payroll sections above are the primary judge-facing proofs.

| Flow | Step | Arcscan |
| --- | --- | --- |
| Swap | Service fee | https://testnet.arcscan.app/tx/0xfc6355aebbb1622661202b3aa8955d863ca81e197d3f0e7f7fcf1fbec0d27b12 |
| Swap | Approve | https://testnet.arcscan.app/tx/0xd2c0f46016eedb9603488cd6126420b53bf6ad9660e6262462cd7d4d13a43c11 |
| Swap | executeSwap | https://testnet.arcscan.app/tx/0x1a8df7e5ef4fc04b4a859e784067ce470886498a1673882af60be97d506ac9f8 |
| Payroll | Service fee | https://testnet.arcscan.app/tx/0xab1b9b62b8cbfc43c3a91fcd8571e75273128fef56ed46c05176d1ba073327ac |
| Payroll | Approve | https://testnet.arcscan.app/tx/0xd6b8739f6980aff40cd5ee1bf8343e7ecc3598ed9bcd991c85234b2af61a23ef |
| Payroll | Payout 1 | https://testnet.arcscan.app/tx/0x1cc0c8e5173cc9782d255d953594e136c58337b2ca437f6890bfe22782fe14d6 |
| Payroll | Payout 2 | https://testnet.arcscan.app/tx/0x15aa1dcced9720df77219174c130229162882d4e94abf3d0f4204558dc869560 |
| Payroll | Payout 3 | https://testnet.arcscan.app/tx/0xa311ec6a9da90ff167d93b7f3fac995ed8817e881e41e885ff787d6b17bc53b1 |
