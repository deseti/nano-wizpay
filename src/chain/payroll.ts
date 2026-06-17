import { getAddress, isAddress, type Address } from "viem";
import { wizpayPayrollRouterAbi } from "../abi/wizpayPayrollRouter.js";
import { arcscanAddressUrl, config } from "../config.js";
import { publicClient } from "./client.js";
import {
  formatTokenAmount,
  normalizeToken,
  parseTokenAmount,
  type TokenMetadata,
} from "./tokens.js";
import { clampSlippageBps } from "./swap.js";

type NormalizedPayout = {
  recipient: Address;
  tokenOut: TokenMetadata;
  amountIn: bigint;
};

export type NormalizedPayrollIntent = {
  tokenIn: TokenMetadata;
  referenceId: string;
  slippageBps: number;
  payouts: NormalizedPayout[];
};

type PayrollBatch = {
  batchIndex: number;
  payouts: NormalizedPayout[];
};

type PayrollEstimate =
  | {
      available: true;
      estimatedAmountsOut: string[];
      totalEstimatedOut: string;
      totalFees: string;
    }
  | {
      available: false;
      error: string;
    };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "estimate unavailable";
}

export async function getPayrollStatus() {
  const [owner, paused, feeBps, feeCollector, fxEngine, whitelistEnabled, usdc, eurc] =
    await Promise.all([
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "owner",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "feeBps",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "feeCollector",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "fxEngine",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "whitelistEnabled",
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "whitelistedTokens",
        args: [config.tokens.usdc],
      }),
      publicClient.readContract({
        address: config.contracts.payrollRouter,
        abi: wizpayPayrollRouterAbi,
        functionName: "whitelistedTokens",
        args: [config.tokens.eurc],
      }),
    ]);

  return {
    address: config.contracts.payrollRouter,
    owner,
    paused,
    feeBps: feeBps.toString(),
    feeCollector,
    fxEngine,
    whitelistEnabled,
    whitelistedTokens: {
      USDC: usdc,
      EURC: eurc,
    },
    maxRecipientsPerTx: config.payroll.maxRecipientsPerTx,
    arcscan: arcscanAddressUrl(config.contracts.payrollRouter),
    fxEngineArcscan: arcscanAddressUrl(fxEngine),
  };
}

export function normalizePayrollIntent(body: unknown): NormalizedPayrollIntent {
  if (!body || typeof body !== "object") {
    throw new Error("request body must be a JSON object");
  }

  const input = body as Record<string, unknown>;
  const tokenIn = normalizeToken(input.tokenIn);
  const referenceId = typeof input.referenceId === "string" ? input.referenceId.trim() : "";
  if (referenceId.length === 0) {
    throw new Error("referenceId must be provided");
  }

  if (!Array.isArray(input.payouts) || input.payouts.length === 0) {
    throw new Error("payouts must be a non-empty array");
  }

  if (input.slippageBps !== undefined) {
    if (typeof input.slippageBps !== "number" || !Number.isFinite(input.slippageBps)) {
      throw new Error("slippageBps must be a number");
    }
  }

  const payouts = input.payouts.map((payout, index) => {
    if (!payout || typeof payout !== "object") {
      throw new Error(`payouts[${index}] must be a JSON object`);
    }

    const item = payout as Record<string, unknown>;
    if (typeof item.recipient !== "string" || !isAddress(item.recipient)) {
      throw new Error(`payouts[${index}].recipient must be a valid address`);
    }

    const tokenOut = normalizeToken(item.tokenOut);
    const amountIn = parseTokenAmount(item.amountIn, tokenIn);

    return {
      recipient: getAddress(item.recipient),
      tokenOut,
      amountIn,
    };
  });

  return {
    tokenIn,
    referenceId,
    slippageBps: clampSlippageBps(
      input.slippageBps === undefined ? undefined : Math.trunc(input.slippageBps as number),
    ),
    payouts,
  };
}

async function readBatchEstimate(
  tokenIn: TokenMetadata,
  payouts: NormalizedPayout[],
): Promise<PayrollEstimate> {
  try {
    const [estimatedAmountsOut, totalEstimatedOut, totalFees] = await publicClient.readContract({
      address: config.contracts.payrollRouter,
      abi: wizpayPayrollRouterAbi,
      functionName: "getBatchEstimatedOutputs",
      args: [
        tokenIn.address,
        payouts.map((payout) => payout.tokenOut.address),
        payouts.map((payout) => payout.amountIn),
      ],
    });

    return {
      available: true,
      estimatedAmountsOut: estimatedAmountsOut.map((amount) => amount.toString()),
      totalEstimatedOut: totalEstimatedOut.toString(),
      totalFees: totalFees.toString(),
    };
  } catch (error) {
    return {
      available: false,
      error: errorMessage(error),
    };
  }
}

function splitBatches(payouts: NormalizedPayout[]): PayrollBatch[] {
  const max = config.payroll.maxRecipientsPerTx;
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("MAX_PAYROLL_RECIPIENTS_PER_TX must be a positive integer");
  }

  const batches: PayrollBatch[] = [];
  for (let index = 0; index < payouts.length; index += max) {
    batches.push({
      batchIndex: batches.length + 1,
      payouts: payouts.slice(index, index + max),
    });
  }
  return batches;
}

export async function planPayrollBatches(intent: NormalizedPayrollIntent) {
  const batches = splitBatches(intent.payouts);
  const totalAmountIn = intent.payouts.reduce((total, payout) => total + payout.amountIn, 0n);
  const distributionByToken = new Map<
    string,
    { tokenOut: TokenMetadata; recipientCount: number; totalAmountIn: bigint }
  >();

  for (const payout of intent.payouts) {
    const current = distributionByToken.get(payout.tokenOut.symbol) ?? {
      tokenOut: payout.tokenOut,
      recipientCount: 0,
      totalAmountIn: 0n,
    };
    current.recipientCount += 1;
    current.totalAmountIn += payout.amountIn;
    distributionByToken.set(payout.tokenOut.symbol, current);
  }

  return {
    service: "wizpay.nano.payroll.plan",
    chain: "arc-testnet",
    payrollRouter: config.contracts.payrollRouter,
    referenceId: intent.referenceId,
    tokenIn: intent.tokenIn,
    recipientCount: intent.payouts.length,
    maxRecipientsPerBatch: config.payroll.maxRecipientsPerTx,
    batchCount: batches.length,
    slippageBps: intent.slippageBps,
    totalAmountIn: {
      human: formatTokenAmount(totalAmountIn, intent.tokenIn),
      baseUnits: totalAmountIn.toString(),
    },
    distribution: Array.from(distributionByToken.values()).map((entry) => ({
      tokenOut: entry.tokenOut.symbol,
      recipientCount: entry.recipientCount,
      totalAmountIn: {
        human: formatTokenAmount(entry.totalAmountIn, intent.tokenIn),
        baseUnits: entry.totalAmountIn.toString(),
      },
    })),
    batches: await Promise.all(
      batches.map(async (batch) => {
        const tokenOutAddresses = batch.payouts.map((payout) => payout.tokenOut.address);
        const allSameTokenOut = tokenOutAddresses.every(
          (address) => address.toLowerCase() === tokenOutAddresses[0].toLowerCase(),
        );

        return {
          batchIndex: batch.batchIndex,
          recipientCount: batch.payouts.length,
          allSameTokenOut,
          recommendedOverload: allSameTokenOut ? "single-tokenOut" : "multi-tokenOut",
          tokenOuts: tokenOutAddresses,
          recipients: batch.payouts.map((payout) => payout.recipient),
          amountsIn: batch.payouts.map((payout) => payout.amountIn.toString()),
          estimates: await readBatchEstimate(intent.tokenIn, batch.payouts),
        };
      }),
    ),
    demoTrace: [
      "Payroll intent received",
      "Validated tokenIn, tokenOuts, recipients, and amounts",
      `Split payouts into Arc-safe batches of max ${config.payroll.maxRecipientsPerTx} recipients`,
      "No execution performed in Stage 1",
    ],
  };
}
