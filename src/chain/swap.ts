import { encodeFunctionData, getAddress, isAddress, type Address } from "viem";
import { xyloRouterAbi } from "../abi/xyloRouter.js";
import { wizpaySwapExecutorAbi } from "../abi/wizpaySwapExecutor.js";
import { arcscanAddressUrl, config } from "../config.js";
import { publicClient } from "./client.js";
import {
  formatTokenAmount,
  normalizeToken,
  parseTokenAmount,
  type TokenMetadata,
} from "./tokens.js";

export type NormalizedSwapIntent = {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: bigint;
  amountInHuman: string;
  recipient?: Address;
  slippageBps?: number;
};

export type SwapQuote = {
  amountOut: bigint;
  priceImpactBps: bigint | null;
  source: "quote" | "getAmountOut";
};

export function normalizeSwapIntent(body: unknown, requireRecipient: boolean): NormalizedSwapIntent {
  if (!body || typeof body !== "object") {
    throw new Error("request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;
  const tokenIn = normalizeToken(input.tokenIn);
  const tokenOut = normalizeToken(input.tokenOut);
  if (tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase()) {
    throw new Error("tokenIn and tokenOut must be different");
  }

  const amountInHuman = typeof input.amountIn === "string" ? input.amountIn.trim() : "";
  const amountIn = parseTokenAmount(amountInHuman, tokenIn);
  let recipient: Address | undefined;
  if (requireRecipient) {
    if (typeof input.recipient !== "string" || !isAddress(input.recipient)) {
      throw new Error("recipient must be a valid address");
    }
    recipient = getAddress(input.recipient);
  }

  let slippageBps: number | undefined;
  if (input.slippageBps !== undefined) {
    if (typeof input.slippageBps !== "number" || !Number.isFinite(input.slippageBps)) {
      throw new Error("slippageBps must be a number");
    }
    slippageBps = Math.trunc(input.slippageBps);
  }

  return { tokenIn, tokenOut, amountIn, amountInHuman, recipient, slippageBps };
}

export function clampSlippageBps(input?: number): number {
  const value = input ?? config.swaps.defaultSlippageBps;
  return Math.min(500, Math.max(10, value));
}

export async function quoteSwap(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
): Promise<SwapQuote> {
  try {
    const result = await publicClient.readContract({
      address: config.contracts.router,
      abi: xyloRouterAbi,
      functionName: "quote",
      args: [tokenIn, tokenOut, amountIn],
    });
    const [amountOut, priceImpactBps] = result;
    return { amountOut, priceImpactBps, source: "quote" };
  } catch {
    const amountOut = await publicClient.readContract({
      address: config.contracts.router,
      abi: xyloRouterAbi,
      functionName: "getAmountOut",
      args: [tokenIn, tokenOut, amountIn],
    });
    return { amountOut, priceImpactBps: null, source: "getAmountOut" };
  }
}

export async function readRiskChecks(tokenIn: Address, tokenOut: Address) {
  const [executorPaused, routerAllowed, tokenInAllowed, tokenOutAllowed] = await Promise.all([
    publicClient.readContract({
      address: config.contracts.executor,
      abi: wizpaySwapExecutorAbi,
      functionName: "paused",
    }),
    publicClient.readContract({
      address: config.contracts.executor,
      abi: wizpaySwapExecutorAbi,
      functionName: "allowedRouters",
      args: [config.contracts.router],
    }),
    publicClient.readContract({
      address: config.contracts.executor,
      abi: wizpaySwapExecutorAbi,
      functionName: "allowedTokens",
      args: [tokenIn],
    }),
    publicClient.readContract({
      address: config.contracts.executor,
      abi: wizpaySwapExecutorAbi,
      functionName: "allowedTokens",
      args: [tokenOut],
    }),
  ]);

  return { executorPaused, routerAllowed, tokenInAllowed, tokenOutAllowed };
}

export function assertRiskChecksPass(checks: Awaited<ReturnType<typeof readRiskChecks>>) {
  if (checks.executorPaused) throw new Error("executor is paused");
  if (!checks.routerAllowed) throw new Error("router is not allowed by executor");
  if (!checks.tokenInAllowed) throw new Error("tokenIn is not allowed by executor");
  if (!checks.tokenOutAllowed) throw new Error("tokenOut is not allowed by executor");
}

export function quoteResponse(
  tokenIn: TokenMetadata,
  tokenOut: TokenMetadata,
  amountIn: bigint,
  quote: SwapQuote,
) {
  return {
    chain: "arc-testnet",
    router: config.contracts.router,
    tokenIn,
    tokenOut,
    amountIn: {
      human: formatTokenAmount(amountIn, tokenIn),
      baseUnits: amountIn.toString(),
    },
    amountOut: {
      human: formatTokenAmount(quote.amountOut, tokenOut),
      baseUnits: quote.amountOut.toString(),
    },
    priceImpact: quote.priceImpactBps === null ? null : `${quote.priceImpactBps.toString()} bps`,
    priceImpactBps: quote.priceImpactBps?.toString() ?? null,
    source: quote.source,
  };
}

export function buildPreparedTransaction(args: {
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
  amountIn: bigint;
  minAmountOut: bigint;
  recipient: Address;
  deadline: bigint;
}) {
  const data = encodeFunctionData({
    abi: wizpaySwapExecutorAbi,
    functionName: "executeSwap",
    args: [
      config.contracts.router,
      args.tokenIn.address,
      args.tokenOut.address,
      args.amountIn,
      args.minAmountOut,
      args.recipient,
      args.deadline,
    ],
  });

  return {
    approval: {
      token: args.tokenIn.address,
      spender: config.contracts.executor,
      amount: args.amountIn.toString(),
    },
    transaction: {
      to: config.contracts.executor,
      value: "0",
      data,
    },
    arcscan: {
      executor: arcscanAddressUrl(config.contracts.executor),
      router: arcscanAddressUrl(config.contracts.router),
    },
  };
}
