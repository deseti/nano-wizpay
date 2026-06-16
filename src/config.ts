// src/config.ts — env loader + Arc chain config
import { defineChain } from "viem";
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// Arc Testnet chain definition (Canteen-hosted)
export const arcTestnet = defineChain({
  id: Number(optional("ARC_CHAIN_ID", "5042001")),
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: {
      http: [optional("ARC_RPC_URL", "https://rpc.arc-testnet.canteen.network")],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.arc-testnet.network",
    },
  },
  testnet: true,
});

export const config = {
  port: Number(optional("PORT", "3000")),
  host: optional("HOST", "0.0.0.0"),
  nodeEnv: optional("NODE_ENV", "development"),
  isDev: optional("NODE_ENV", "development") === "development",

  arc: {
    rpcUrl: optional("ARC_RPC_URL", "https://rpc.arc-testnet.canteen.network"),
    chainId: Number(optional("ARC_CHAIN_ID", "5042001")),
    chain: arcTestnet,
    usdcContract: optional(
      "USDC_CONTRACT",
      "0x3600000000000000000000000000000000000000"
    ) as `0x${string}`,
  },

  server: {
    privateKey: optional("SERVER_WALLET_PRIVATE_KEY"),
  },

  settlement: {
    mode: optional("SETTLEMENT_MODE", "arc_testnet"),
    minPaymentUsdc: optional("MIN_PAYMENT_USDC", "0.0001"),
  },

  llm: {
    provider: optional("LLM_PROVIDER", "openai"),
    apiKey: optional("LLM_API_KEY"),
    model: optional("LLM_MODEL", "gpt-4o-mini"),
  },

  x402: {
    facilitatorUrl: optional("X402_FACILITATOR_URL"),
    network: optional("X402_NETWORK", "arc-testnet"),
  },
};

export function requireServerKey(): `0x${string}` {
  const k = config.server.privateKey;
  if (!k) throw new Error("SERVER_WALLET_PRIVATE_KEY is empty");
  return k as `0x${string}`;
}

export function requireLlmKey(): string {
  const k = config.llm.apiKey;
  if (!k) throw new Error("LLM_API_KEY is empty");
  return k;
}
