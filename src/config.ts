import "dotenv/config";
import { defineChain, getAddress, parseUnits, type Address } from "viem";

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

function address(name: string, fallback: string): Address {
  return getAddress(optional(name, fallback));
}

export const config = {
  port: Number(optional("PORT", "3000")),
  host: optional("HOST", "0.0.0.0"),
  apiBaseUrl: optional("API_BASE_URL", "http://localhost:3000"),
  arc: {
    rpcUrl: optional("ARC_TESTNET_RPC_URL", "https://rpc.testnet.arc.network"),
    chainId: Number(optional("ARC_TESTNET_CHAIN_ID", "5042002")),
    explorer: optional("ARC_TESTNET_EXPLORER", "https://testnet.arcscan.app"),
  },
  contracts: {
    executor: address(
      "WIZPAY_SWAP_EXECUTOR",
      "0x17685466759f9Cde06f0DCbB5464164ABe541eFA",
    ),
    router: address(
      "XYLO_ROUTER",
      "0x73742278c31a76dBb0D2587d03ef92E6E2141023",
    ),
  },
  tokens: {
    usdc: address("USDC_ADDRESS", "0x3600000000000000000000000000000000000000"),
    eurc: address("EURC_ADDRESS", "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"),
  },
  serviceFee: {
    collector: address(
      "SERVICE_FEE_COLLECTOR",
      "0x32F251fc36A1174901124589EAC2d4E391816F69",
    ),
    usdc: optional("SERVICE_FEE_USDC", "0.003"),
  },
  swaps: {
    defaultSlippageBps: Number(optional("DEFAULT_SLIPPAGE_BPS", "100")),
    deadlineSeconds: Number(optional("SWAP_DEADLINE_SECONDS", "600")),
  },
};

export const arcTestnet = defineChain({
  id: config.arc.chainId,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: [config.arc.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: config.arc.explorer },
  },
  testnet: true,
});

export const SERVICE_ID = "wizpay.nano.swap.prepare";
export const SERVICE_FEE_BASE_UNITS = parseUnits(config.serviceFee.usdc, 6);

export function arcscanAddressUrl(addr: Address): string {
  return `${config.arc.explorer}/address/${addr}`;
}

export function arcscanTxUrl(hash: `0x${string}`): string {
  return `${config.arc.explorer}/tx/${hash}`;
}
