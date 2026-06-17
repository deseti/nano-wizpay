import type { FastifyInstance } from "fastify";
import { normalizePayrollIntent, planPayrollBatches } from "../chain/payroll.js";

export async function payrollRoutes(app: FastifyInstance) {
  app.post("/payroll/plan", async (request, reply) => {
    try {
      const intent = normalizePayrollIntent(request.body);
      return await planPayrollBatches(intent);
    } catch (error) {
      return reply.code(400).send({
        error: "INVALID_PAYROLL_PLAN_REQUEST",
        message: error instanceof Error ? error.message : "invalid payroll plan request",
      });
    }
  });
}
