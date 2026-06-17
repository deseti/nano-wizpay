import type { FastifyInstance } from "fastify";
import { wizpaySwapExecutorAbi } from "../abi/wizpaySwapExecutor.js";
import { xyloRouterAbi } from "../abi/xyloRouter.js";
import { arcscanAddressUrl, config } from "../config.js";
import { publicClient } from "../chain/client.js";
import { getPayrollStatus } from "../chain/payroll.js";

export async function contractsRoutes(app: FastifyInstance) {
  app.get("/contracts/status", async () => {
    const [
      paused,
      feeBps,
      feeRecipient,
      routerAllowed,
      usdcAllowed,
      eurcAllowed,
      routerUsdc,
      routerEurc,
      routerFactory,
      payroll,
    ] = await Promise.all([
      publicClient.readContract({
        address: config.contracts.executor,
        abi: wizpaySwapExecutorAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: config.contracts.executor,
        abi: wizpaySwapExecutorAbi,
        functionName: "feeBps",
      }),
      publicClient.readContract({
        address: config.contracts.executor,
        abi: wizpaySwapExecutorAbi,
        functionName: "feeRecipient",
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
        args: [config.tokens.usdc],
      }),
      publicClient.readContract({
        address: config.contracts.executor,
        abi: wizpaySwapExecutorAbi,
        functionName: "allowedTokens",
        args: [config.tokens.eurc],
      }),
      publicClient.readContract({
        address: config.contracts.router,
        abi: xyloRouterAbi,
        functionName: "USDC",
      }),
      publicClient.readContract({
        address: config.contracts.router,
        abi: xyloRouterAbi,
        functionName: "EURC",
      }),
      publicClient.readContract({
        address: config.contracts.router,
        abi: xyloRouterAbi,
        functionName: "factory",
      }),
      getPayrollStatus(),
    ]);

    return {
      chain: "arc-testnet",
      executor: {
        address: config.contracts.executor,
        paused,
        feeBps: feeBps.toString(),
        feeRecipient,
        allowedRouters: {
          [config.contracts.router]: routerAllowed,
        },
        allowedTokens: {
          USDC: usdcAllowed,
          EURC: eurcAllowed,
        },
        arcscan: arcscanAddressUrl(config.contracts.executor),
      },
      router: {
        address: config.contracts.router,
        USDC: routerUsdc,
        EURC: routerEurc,
        factory: routerFactory,
        arcscan: arcscanAddressUrl(config.contracts.router),
      },
      tokens: {
        USDC: {
          address: config.tokens.usdc,
          arcscan: arcscanAddressUrl(config.tokens.usdc),
        },
        EURC: {
          address: config.tokens.eurc,
          arcscan: arcscanAddressUrl(config.tokens.eurc),
        },
      },
      payroll,
    };
  });
}
