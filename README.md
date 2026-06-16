# WizPay Nano

> USDC pay-per-call API for AI agents, settled on **Arc L1** (Circle's stablecoin-native chain).
> Built for the **Lepton Agents Hackathon** (Canteen × Circle), June 15–29 2026.

🌐 **Live (after deploy):** https://nano.wizpay.xyz
🔌 **API:** https://api.wizpay.xyz
📺 **Demo:** _(link to 3-min video)_

## What is this?

WizPay Nano exposes a small set of **monetized HTTP endpoints** for AI agents.
Each call returns `402 Payment Required` with a USDC invoice; the caller pays in
USDC on Arc, then retries with an `X-PAYMENT` header — gateway returns `200 OK`.

Pattern: **402 → pay → 200**, settled in <500ms with ~$0.01 USDC fees.

## Endpoints (planned)

| Method | Path | Price (USDC) | Purpose |
|---|---|---|---|
| `POST` | `/quote-swap` | free | Get swap rate (no x402) |
| `GET`  | `/balance/:addr` | $0.0001 | Read USDC balance |
| `POST` | `/transfer` | $0.003 | Send USDC |
| `POST` | `/execute-swap` | $0.005 | Execute swap |
| `POST` | `/auto-swap` | $0.01 | Strategy (DCA/threshold) |

## Stack

- **Runtime:** Node.js 22 + TypeScript
- **Server:** Fastify
- **Chain:** viem (EVM-compatible, Arc Testnet)
- **Payment:** x402 protocol (manual middleware, USDC settlement)
- **Frontend:** 1-file HTML on Vercel (separate folder `web/`)
- **Agents:** 3 Node.js demo agents (oracle, swap, treasury)

## Local Dev

```bash
cp .env.example .env  # fill in test wallet keys + LLM key
npm install
npm run dev           # http://localhost:3000
```

## Project Structure

```
nano-wizpay/
├── src/
│   ├── server.ts          # Fastify entrypoint
│   ├── config.ts          # env loader + chain config
│   ├── x402.ts            # manual x402 middleware (402→pay→200)
│   ├── routes/
│   │   ├── balance.ts
│   │   ├── transfer.ts
│   │   ├── quote-swap.ts
│   │   ├── execute-swap.ts
│   │   └── auto-swap.ts
│   ├── chain/
│   │   ├── usdc.ts        # USDC contract helpers
│   │   └── wallet.ts      # viem wallet helpers
│   └── agents/
│       ├── oracle.ts
│       ├── swap.ts
│       └── treasury.ts
├── web/
│   └── index.html         # 1-file landing
├── .env.example
├── package.json
└── tsconfig.json
```

## Hackathon

- **Event:** Lepton Agents Hackathon, Canteen × Circle × Arc
- **Dates:** Jun 15 – Jun 29, 2026
- **RFB alignment:** RFB 02 (Selling Agent Services) + RFB 03 (A2A Networks)
- **Submission:** GitHub repo + 3-min demo video + live deployed link

## License

MIT
