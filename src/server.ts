// src/server.ts — WizPay Nano entrypoint (Phase 1a: hello world)
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss" },
    },
  },
});

await app.register(cors, { origin: true });

// Health
app.get("/health", async () => ({
  status: "ok",
  service: "wizpay-nano",
  version: "0.1.0",
  timestamp: new Date().toISOString(),
}));

// Info (placeholder for landing page)
app.get("/", async () => ({
  name: "WizPay Nano",
  tagline: "USDC pay-per-call API for AI agents on Arc",
  status: "Phase 1a — local dev only",
  endpoints: {
    health: "GET /health",
  },
  hackathon: "Lepton Agents (Canteen × Circle), Jun 15–29 2026",
}));

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`🟢 WizPay Nano listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
