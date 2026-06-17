import { encodeFunctionData, getAddress, isAddress, type Address } from "viem";
import {
  wizpayPayrollRouterAbi,
  wizpayPayrollRouterMultiTokenOutAbi,
  wizpayPayrollRouterSingleTokenOutAbi,
} from "../abi/wizpayPayrollRouter.js";
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

export type NormalizedPayrollPrepareIntent = NormalizedPayrollIntent & {
  payer: Address;
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

type StrictPayrollEstimate = {
  estimatedAmountsOut: readonly bigint[];
  totalEstimatedOut: bigint;
  totalFees: bigint;
};

const PAYROLL_PREPARE_SERVICE_ID = "wizpay.nano.payroll.prepare";
const SINGLE_TOKEN_OUT_SIGNATURE =
  "batchRouteAndPay(address,address,address[],uint256[],uint256[],string)";
const MULTI_TOKEN_OUT_SIGNATURE =
  "batchRouteAndPay(address,address[],address[],uint256[],uint256[],string)";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "estimate unavailable";
}

function jsonArrayForCli(values: readonly string[]): string {
  return `'${JSON.stringify(values)}'`;
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
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

export function normalizePayrollPrepareIntent(body: unknown): NormalizedPayrollPrepareIntent {
  const intent = normalizePayrollIntent(body);
  const input = body as Record<string, unknown>;
  if (typeof input.payer !== "string" || !isAddress(input.payer)) {
    throw new Error("payer must be a valid address");
  }

  return {
    ...intent,
    payer: getAddress(input.payer),
  };
}

async function readBatchEstimateValues(
  tokenIn: TokenMetadata,
  payouts: NormalizedPayout[],
): Promise<StrictPayrollEstimate> {
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

  return { estimatedAmountsOut, totalEstimatedOut, totalFees };
}

async function readBatchEstimate(
  tokenIn: TokenMetadata,
  payouts: NormalizedPayout[],
): Promise<PayrollEstimate> {
  try {
    const estimate = await readBatchEstimateValues(tokenIn, payouts);
    return {
      available: true,
      estimatedAmountsOut: estimate.estimatedAmountsOut.map((amount) => amount.toString()),
      totalEstimatedOut: estimate.totalEstimatedOut.toString(),
      totalFees: estimate.totalFees.toString(),
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

function payrollTotals(payouts: NormalizedPayout[], tokenIn: TokenMetadata) {
  const totalAmountIn = payouts.reduce((total, payout) => total + payout.amountIn, 0n);
  const distributionByToken = new Map<
    string,
    { tokenOut: TokenMetadata; recipientCount: number; totalAmountIn: bigint }
  >();

  for (const payout of payouts) {
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
    totalAmountIn,
    distribution: Array.from(distributionByToken.values()).map((entry) => ({
      tokenOut: entry.tokenOut.symbol,
      recipientCount: entry.recipientCount,
      totalAmountIn: {
        human: formatTokenAmount(entry.totalAmountIn, tokenIn),
        baseUnits: entry.totalAmountIn.toString(),
      },
    })),
  };
}

export async function planPayrollBatches(intent: NormalizedPayrollIntent) {
  const batches = splitBatches(intent.payouts);
  const totals = payrollTotals(intent.payouts, intent.tokenIn);

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
      human: formatTokenAmount(totals.totalAmountIn, intent.tokenIn),
      baseUnits: totals.totalAmountIn.toString(),
    },
    distribution: totals.distribution,
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

export async function preparePayrollBatches(intent: NormalizedPayrollPrepareIntent) {
  const batches = splitBatches(intent.payouts);
  const totals = payrollTotals(intent.payouts, intent.tokenIn);
  const preparedBatches = await Promise.all(
    batches.map(async (batch) => {
      const tokenOutAddresses = batch.payouts.map((payout) => payout.tokenOut.address);
      const recipients = batch.payouts.map((payout) => payout.recipient);
      const amountsIn = batch.payouts.map((payout) => payout.amountIn);
      const allSameTokenOut = tokenOutAddresses.every(
        (address) => address.toLowerCase() === tokenOutAddresses[0].toLowerCase(),
      );
      const estimate = await readBatchEstimateValues(intent.tokenIn, batch.payouts).catch((error) => {
        throw new Error(`batch ${batch.batchIndex} estimates unavailable: ${errorMessage(error)}`);
      });

      if (estimate.estimatedAmountsOut.length !== batch.payouts.length) {
        throw new Error(`batch ${batch.batchIndex} estimate count did not match payout count`);
      }

      const minAmountsOut = estimate.estimatedAmountsOut.map(
        (amount) => (amount * BigInt(10_000 - intent.slippageBps)) / 10_000n,
      );
      const functionSignature = allSameTokenOut
        ? SINGLE_TOKEN_OUT_SIGNATURE
        : MULTI_TOKEN_OUT_SIGNATURE;
      const amountStrings = amountsIn.map((amount) => amount.toString());
      const minAmountStrings = minAmountsOut.map((amount) => amount.toString());

      const executionArgs = allSameTokenOut
        ? {
            tokenIn: intent.tokenIn.address,
            tokenOut: tokenOutAddresses[0],
            recipients,
            amountsIn: amountStrings,
            minAmountsOut: minAmountStrings,
            referenceId: intent.referenceId,
          }
        : {
            tokenIn: intent.tokenIn.address,
            tokenOuts: tokenOutAddresses,
            recipients,
            amountsIn: amountStrings,
            minAmountsOut: minAmountStrings,
            referenceId: intent.referenceId,
          };

      const calldata = allSameTokenOut
        ? encodeFunctionData({
            abi: wizpayPayrollRouterSingleTokenOutAbi,
            functionName: "batchRouteAndPay",
            args: [
              intent.tokenIn.address,
              tokenOutAddresses[0],
              recipients,
              amountsIn,
              minAmountsOut,
              intent.referenceId,
            ],
          })
        : encodeFunctionData({
            abi: wizpayPayrollRouterMultiTokenOutAbi,
            functionName: "batchRouteAndPay",
            args: [
              intent.tokenIn.address,
              tokenOutAddresses,
              recipients,
              amountsIn,
              minAmountsOut,
              intent.referenceId,
            ],
          });

      const circleCliCommand = allSameTokenOut
        ? `circle wallet execute "${functionSignature}" ${intent.tokenIn.address} ${tokenOutAddresses[0]} ${jsonArrayForCli(recipients)} ${jsonArrayForCli(amountStrings)} ${jsonArrayForCli(minAmountStrings)} ${shellSingleQuote(intent.referenceId)} --contract ${config.contracts.payrollRouter} --address ${intent.payer} --chain ARC-TESTNET`
        : `circle wallet execute "${functionSignature}" ${intent.tokenIn.address} ${jsonArrayForCli(tokenOutAddresses)} ${jsonArrayForCli(recipients)} ${jsonArrayForCli(amountStrings)} ${jsonArrayForCli(minAmountStrings)} ${shellSingleQuote(intent.referenceId)} --contract ${config.contracts.payrollRouter} --address ${intent.payer} --chain ARC-TESTNET`;

      return {
        batchIndex: batch.batchIndex,
        recipientCount: batch.payouts.length,
        allSameTokenOut,
        recommendedOverload: allSameTokenOut ? "single-tokenOut" : "multi-tokenOut",
        functionSignature,
        executionArgs,
        calldata,
        circleCliCommand,
        estimates: {
          estimatedAmountsOut: estimate.estimatedAmountsOut.map((amount) => amount.toString()),
          totalEstimatedOut: estimate.totalEstimatedOut.toString(),
          totalFees: estimate.totalFees.toString(),
        },
      };
    }),
  );

  return {
    service: PAYROLL_PREPARE_SERVICE_ID,
    chain: "arc-testnet",
    payrollRouter: config.contracts.payrollRouter,
    referenceId: intent.referenceId,
    payer: intent.payer,
    tokenIn: intent.tokenIn,
    recipientCount: intent.payouts.length,
    maxRecipientsPerBatch: config.payroll.maxRecipientsPerTx,
    batchCount: batches.length,
    slippageBps: intent.slippageBps,
    totalAmountIn: {
      human: formatTokenAmount(totals.totalAmountIn, intent.tokenIn),
      baseUnits: totals.totalAmountIn.toString(),
    },
    distribution: totals.distribution,
    approval: {
      token: intent.tokenIn.symbol,
      tokenAddress: intent.tokenIn.address,
      spender: config.contracts.payrollRouter,
      amount: {
        human: formatTokenAmount(totals.totalAmountIn, intent.tokenIn),
        baseUnits: totals.totalAmountIn.toString(),
      },
      circleCliCommand: `circle wallet execute "approve(address,uint256)" ${config.contracts.payrollRouter} ${totals.totalAmountIn.toString()} --contract ${intent.tokenIn.address} --address ${intent.payer} --chain ARC-TESTNET`,
    },
    batches: preparedBatches,
    arcscan: {
      payrollRouter: arcscanAddressUrl(config.contracts.payrollRouter),
      payer: arcscanAddressUrl(intent.payer),
    },
    demoTrace: [
      "Payment verified",
      "Payroll execution plan unlocked",
      "Approve tokenIn to WizPay payroll router",
      "Execute each batchRouteAndPay command from the payer wallet",
      "No backend execution performed",
    ],
  };
}
