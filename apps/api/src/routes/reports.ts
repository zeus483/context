import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma";

export function registerReportRoutes(app: FastifyInstance) {
  app.post("/api/reports", async (req) => {
    const body = req.body as { reporterId: string; targetId: string; reason: string };
    const report = await prisma.report.create({
      data: {
        reporterId: body.reporterId,
        targetId: body.targetId,
        reason: body.reason
      }
    });
    return { report };
  });
}
