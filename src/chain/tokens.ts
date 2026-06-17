import { formatUnits, getAddress, isAddress, parseUnits, type Address } from "viem";
import { config } from "../config.js";

export type TokenSymbol = "USDC" | "EURC";

export type TokenMetadata = {
  symbol: TokenSymbol;
  address: Address;
  decimals: 6;
};

const TOKENS: TokenMetadata[] = [
  { symbol: "USDC", address: config.tokens.usdc, decimals: 6 },
  { symbol: "EURC", address: config.tokens.eurc, decimals: 6 },
];

const USYC_ADDRESS = "0x136471a34f6ef19fe571effc1ca711fdb8e49f2b";

export function supportedTokens(): TokenMetadata[] {
  return TOKENS;
}

export function normalizeToken(input: unknown): TokenMetadata {
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error("token must be USDC, EURC, or a supported token address");
  }

  const value = input.trim();
  const bySymbol = TOKENS.find((token) => token.symbol === value.toUpperCase());
  if (bySymbol) return bySymbol;

  if (value.toUpperCase() === "USYC") {
    throw new Error("USYC is not supported in this MVP");
  }

  if (!isAddress(value)) {
    throw new Error(`unsupported token: ${value}`);
  }

  const normalized = getAddress(value);
  if (normalized.toLowerCase() === USYC_ADDRESS) {
    throw new Error("USYC is not supported in this MVP");
  }

  const byAddress = TOKENS.find(
    (token) => token.address.toLowerCase() === normalized.toLowerCase(),
  );
  if (!byAddress) {
    throw new Error(`unsupported token address: ${normalized}`);
  }

  return byAddress;
}

export function parseTokenAmount(amount: unknown, token: TokenMetadata): bigint {
  if (typeof amount !== "string" || !/^\d+(\.\d+)?$/.test(amount.trim())) {
    throw new Error("amountIn must be a positive human decimal string");
  }
  const parsed = parseUnits(amount.trim(), token.decimals);
  if (parsed <= 0n) {
    throw new Error("amountIn must be greater than zero");
  }
  return parsed;
}

export function formatTokenAmount(amount: bigint, token: TokenMetadata): string {
  return formatUnits(amount, token.decimals);
}
