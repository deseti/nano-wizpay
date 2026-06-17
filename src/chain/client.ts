import { createPublicClient, http } from "viem";
import { arcTestnet, config } from "../config.js";

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(config.arc.rpcUrl),
});
