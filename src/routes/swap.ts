import type { FastifyInstance } from "fastify";
import { arcscanTxUrl, config, SERVICE_ID } from "../config.js";
import { verifyPaymentHeader } from "../chain/payment.js";
import {
  assertRiskChecksPass,
  buildPreparedTransaction,
  clampSlippageBps,
  normalizeSwapIntent,
  quoteResponse,
  quoteSwap,
  readRiskChecks,
} from "../chain/swap.js";
import { formatTokenAmount } from "../chain/tokens.js";

function jsonForCli(body: unknown): string {
  return JSON.stringify(body).replaceAll("'", "'\\''");
}

function paymentRequired(body: unknown) {
  const requestBody = jsonForCli(body);

  return {
    error: "PAYMENT_REQUIRED",
    service: SERVICE_ID,
    amount: config.serviceFee.usdc,
    currency: "USDC",
    chain: "arc-testnet",
    payTo: config.serviceFee.collector,
    instructions: {
      circleCli:
        "Use Circle CLI services pay against this endpoint with the same POST body and a max amount cap.",
      fallback: "For local dev only, send a real USDC transfer and retry with X-PAYMENT: <txHash>.",
    },
    circleCliExample: `circle services pay ${config.apiBaseUrl}/swap/prepare --address <AGENT_WALLET_ADDRESS> --chain ARC-TESTNET --max-amount 0.01 -X POST -d '${requestBody}'`,
  };
}

function buildCircleCli(args: {
  router: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  recipient: string;
  deadline: string;
}) {
  return {
    approveCommand: `circle wallet execute "approve(address,uint256)" ${config.contracts.executor} ${args.amountIn} --contract ${args.tokenIn} --address ${args.recipient} --chain ARC-TESTNET`,
    executeSwapCommand: `circle wallet execute "executeSwap(address,address,address,uint256,uint256,address,uint256)" ${args.router} ${args.tokenIn} ${args.tokenOut} ${args.amountIn} ${args.minAmountOut} ${args.recipient} ${args.deadline} --contract ${config.contracts.executor} --address ${args.recipient} --chain ARC-TESTNET`,
    note: "If the executor wallet differs from recipient, replace --address with the executor wallet address.",
  };
}

export async function swapRoutes(app: FastifyInstance) {
  app.post("/swap/quote", async (request, reply) => {
    try {
      const intent = normalizeSwapIntent(request.body, false);
      const quote = await quoteSwap(intent.tokenIn.address, intent.tokenOut.address, intent.amountIn);
      return quoteResponse(intent.tokenIn, intent.tokenOut, intent.amountIn, quote);
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_SWAP_QUOTE_REQUEST",
        message: error instanceof Error ? error.message : "invalid quote request",
      });
    }
  });

  app.post("/swap/prepare", async (request, reply) => {
    let intent: ReturnType<typeof normalizeSwapIntent>;
    try {
      intent = normalizeSwapIntent(request.body, true);
      const slippageBps = clampSlippageBps(intent.slippageBps);
      const quote = await quoteSwap(intent.tokenIn.address, intent.tokenOut.address, intent.amountIn);
      const minAmountOut = (quote.amountOut * BigInt(10_000 - slippageBps)) / 10_000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + config.swaps.deadlineSeconds);
      const riskChecks = await readRiskChecks(intent.tokenIn.address, intent.tokenOut.address);
      assertRiskChecksPass(riskChecks);

      const payment = await verifyPaymentHeader(request.headers["x-payment"]);
      if (!payment.paid) {
        return reply.code(402).send(paymentRequired(request.body));
      }

      const prepared = buildPreparedTransaction({
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn,
        minAmountOut,
        recipient: intent.recipient!,
        deadline,
      });
      const executionArgs = {
        router: config.contracts.router,
        tokenIn: intent.tokenIn.address,
        tokenOut: intent.tokenOut.address,
        amountIn: intent.amountIn.toString(),
        minAmountOut: minAmountOut.toString(),
        recipient: intent.recipient!,
        deadline: deadline.toString(),
      };

      return {
        service: SERVICE_ID,
        chain: "arc-testnet",
        executor: config.contracts.executor,
        router: config.contracts.router,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: {
          human: formatTokenAmount(intent.amountIn, intent.tokenIn),
          baseUnits: intent.amountIn.toString(),
        },
        quote: {
          amountOut: {
            human: formatTokenAmount(quote.amountOut, intent.tokenOut),
            baseUnits: quote.amountOut.toString(),
          },
          priceImpactBps: quote.priceImpactBps?.toString() ?? null,
          source: quote.source,
        },
        slippageBps,
        minAmountOut: {
          human: formatTokenAmount(minAmountOut, intent.tokenOut),
          baseUnits: minAmountOut.toString(),
        },
        deadline: Number(deadline),
        approval: prepared.approval,
        transaction: prepared.transaction,
        executionArgs,
        circleCli: buildCircleCli(executionArgs),
        demoTrace: [
          "Payment verified",
          "Execution plan unlocked",
          "Approve tokenIn to WizPaySwapExecutor",
          "Execute swap with Circle CLI",
          "Confirm tx on Arcscan",
        ],
        riskChecks,
        payment: {
          mode: "txhash",
          txHash: payment.txHash,
          arcscan: arcscanTxUrl(payment.txHash),
        },
        arcscan: prepared.arcscan,
      };
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_SWAP_PREPARE_REQUEST",
        message: error instanceof Error ? error.message : "invalid prepare request",
      });
    }
  });
}
