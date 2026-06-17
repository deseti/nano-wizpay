import type { FastifyInstance } from "fastify";
import { arcscanAddressUrl, config, SERVICE_ID } from "../config.js";
import { supportedTokens } from "../chain/tokens.js";

export async function servicesRoutes(app: FastifyInstance) {
  app.get("/", async () => ({
    name: "WizPay Nano",
    description:
      "USDC pay-per-call swap execution-planning API for AI treasury agents on Arc Testnet.",
    links: {
      services: "/services",
      health: "/health",
    },
  }));

  app.get("/services", async () => ({
    services: [
      {
        id: SERVICE_ID,
        method: "POST",
        path: "/swap/prepare",
        price: {
          amount: config.serviceFee.usdc,
          currency: "USDC",
        },
        chain: "arc-testnet",
        supportedTokens: supportedTokens().map((token) => token.symbol),
        executor: config.contracts.executor,
        router: config.contracts.router,
        paymentModel: "402 USDC service fee, Circle CLI compatible",
        note: "amountIn, tokenIn, tokenOut, and recipient are agent-provided. WizPay Nano does not custody swap funds or choose the swap amount.",
        arcscan: {
          executor: arcscanAddressUrl(config.contracts.executor),
          router: arcscanAddressUrl(config.contracts.router),
        },
      },
      {
        id: "wizpay.nano.payroll.plan",
        method: "POST",
        path: "/payroll/plan",
        price: "free",
        chain: "arc-testnet",
        supportedTokens: supportedTokens().map((token) => token.symbol),
        payrollRouter: config.contracts.payrollRouter,
        maxRecipientsPerBatch: config.payroll.maxRecipientsPerTx,
        note: "Stage 1 planner only; execution prepare will be added later.",
        arcscan: {
          payrollRouter: arcscanAddressUrl(config.contracts.payrollRouter),
        },
      },
      {
        id: "wizpay.nano.payroll.prepare",
        method: "POST",
        path: "/payroll/prepare",
        price: {
          amount: config.serviceFee.usdc,
          currency: "USDC",
        },
        chain: "arc-testnet",
        supportedTokens: supportedTokens().map((token) => token.symbol),
        paymentModel: "402 USDC service fee, Circle CLI compatible",
        maxRecipientsPerBatch: config.payroll.maxRecipientsPerTx,
        note: "Returns batch calldata plus Circle CLI routeAndPay fallback commands; does not custody or execute funds.",
      },
    ],
  }));
}
