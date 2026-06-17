import type { FastifyInstance } from "fastify";
import { verifyPaymentHeader } from "../chain/payment.js";
import {
  normalizePayrollIntent,
  normalizePayrollPrepareIntent,
  planPayrollBatches,
  preparePayrollBatches,
} from "../chain/payroll.js";
import { config } from "../config.js";

const PAYROLL_PREPARE_SERVICE_ID = "wizpay.nano.payroll.prepare";

function hasPaymentHeader(value: unknown): boolean {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

function paymentRequired(reason?: string) {
  return {
    error: "PAYMENT_REQUIRED",
    service: PAYROLL_PREPARE_SERVICE_ID,
    amount: config.serviceFee.usdc,
    currency: "USDC",
    chain: "arc-testnet",
    payTo: config.serviceFee.collector,
    reason,
    instructions: {
      circleCli: "Use Circle CLI to pay the service fee, then retry with X-PAYMENT.",
      fallback: "For local dev only, send a real USDC transfer and retry with X-PAYMENT: <txHash>.",
    },
    circleCliExample: `circle wallet transfer ${config.serviceFee.collector} --amount ${config.serviceFee.usdc} --address <PAYER_WALLET_ADDRESS> --chain ARC-TESTNET --token ${config.tokens.usdc}`,
  };
}

export async function payrollRoutes(app: FastifyInstance) {
  app.post("/payroll/plan", async (request, reply) => {
    try {
      const intent = normalizePayrollIntent(request.body);
      return await planPayrollBatches(intent);
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_PAYROLL_PLAN_REQUEST",
        message: error instanceof Error ? error.message : "invalid payroll plan request",
      });
    }
  });

  app.post("/payroll/prepare", async (request, reply) => {
    try {
      const intent = normalizePayrollPrepareIntent(request.body);
      if (!hasPaymentHeader(request.headers["x-payment"])) {
        return reply.code(402).send(paymentRequired("missing or invalid X-PAYMENT header"));
      }

      const prepared = await preparePayrollBatches(intent);
      const payment = await verifyPaymentHeader(request.headers["x-payment"]);
      if (!payment.paid) {
        return reply.code(402).send(paymentRequired(payment.reason));
      }

      return {
        service: prepared.service,
        chain: prepared.chain,
        payment: {
          verified: true,
          txHash: payment.txHash,
          amount: config.serviceFee.usdc,
          currency: "USDC",
        },
        payrollRouter: prepared.payrollRouter,
        referenceId: prepared.referenceId,
        payer: prepared.payer,
        tokenIn: prepared.tokenIn,
        recipientCount: prepared.recipientCount,
        maxRecipientsPerBatch: prepared.maxRecipientsPerBatch,
        batchCount: prepared.batchCount,
        slippageBps: prepared.slippageBps,
        totalAmountIn: prepared.totalAmountIn,
        distribution: prepared.distribution,
        approval: prepared.approval,
        batches: prepared.batches,
        circleCliFallback: prepared.circleCliFallback,
        arcscan: prepared.arcscan,
        demoTrace: prepared.demoTrace,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid payroll prepare request";
      const statusCode = message.includes("estimates unavailable") ? 502 : 400;
      return reply.code(statusCode).send({
        error: "INVALID_PAYROLL_PREPARE_REQUEST",
        message,
      });
    }
  });
}
