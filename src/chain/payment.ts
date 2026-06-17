import { decodeEventLog, getAddress, type Hex } from "viem";
import { erc20Abi } from "../abi/erc20.js";
import { SERVICE_FEE_BASE_UNITS, config } from "../config.js";
import { publicClient } from "./client.js";

const usedPaymentTxHashes = new Set<string>();

export type PaymentVerification =
  | { paid: true; txHash: Hex }
  | { paid: false; reason: string };

export async function verifyPaymentHeader(value: unknown): Promise<PaymentVerification> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { paid: false, reason: "missing X-PAYMENT header" };
  }

  const txHash = value.trim() as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { paid: false, reason: "X-PAYMENT must be a transaction hash" };
  }

  const key = txHash.toLowerCase();
  if (usedPaymentTxHashes.has(key)) {
    return { paid: false, reason: "payment transaction hash already consumed" };
  }

  const receipt = await publicClient
    .getTransactionReceipt({ hash: txHash })
    .catch(() => undefined);
  if (!receipt) {
    return { paid: false, reason: "payment transaction was not found on Arc Testnet" };
  }
  if (receipt.status !== "success") {
    return { paid: false, reason: "payment transaction did not succeed" };
  }

  const collector = config.serviceFee.collector.toLowerCase();
  const hasUsdcTransfer = receipt.logs.some((log) => {
    if (log.address.toLowerCase() !== config.tokens.usdc.toLowerCase()) return false;

    try {
      const decoded = decodeEventLog({
        abi: erc20Abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") return false;

      const to = getAddress(decoded.args.to).toLowerCase();
      return to === collector && decoded.args.value >= SERVICE_FEE_BASE_UNITS;
    } catch {
      return false;
    }
  });

  if (!hasUsdcTransfer) {
    return { paid: false, reason: "no sufficient USDC Transfer to service fee collector found" };
  }

  usedPaymentTxHashes.add(key);
  return { paid: true, txHash };
}
