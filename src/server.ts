import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { config } from "./config.js";
import { contractsRoutes } from "./routes/contracts.js";
import { servicesRoutes } from "./routes/services.js";
import { swapRoutes } from "./routes/swap.js";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss" },
    },
  },
});

await app.register(cors, { origin: true });
await app.register(servicesRoutes);
await app.register(contractsRoutes);
await app.register(swapRoutes);

app.get("/health", async () => ({
  status: "ok",
  service: "wizpay-nano",
  chain: "arc-testnet",
  timestamp: new Date().toISOString(),
}));

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`WizPay Nano listening on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
