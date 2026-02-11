import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma";
import { config } from "../config";

function checkAdmin(req: { headers: Record<string, string | string[] | undefined> }) {
  const key = req.headers["x-admin-key"];
  if (!config.adminKey) return false;
  if (Array.isArray(key)) return key[0] === config.adminKey;
  return key === config.adminKey;
}

export function registerAdminRoutes(app: FastifyInstance) {
  app.get("/api/admin/reports", async (req, reply) => {
    if (!checkAdmin(req)) return reply.status(401).send({ error: "Unauthorized" });
    const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return { reports };
  });

  app.post("/api/admin/ban", async (req, reply) => {
    if (!checkAdmin(req)) return reply.status(401).send({ error: "Unauthorized" });
    const body = req.body as { targetId: string; until: string; reason: string };
    const ban = await prisma.ban.create({
      data: {
        targetId: body.targetId,
        until: new Date(body.until),
        reason: body.reason
      }
    });
    return { ban };
  });

  app.post("/api/admin/packs", async (req, reply) => {
    if (!checkAdmin(req)) return reply.status(401).send({ error: "Unauthorized" });
    const body = req.body as { packId: string; enabled: boolean };
    const setting = await prisma.packSetting.upsert({
      where: { packId: body.packId },
      update: { enabled: body.enabled },
      create: { packId: body.packId, enabled: body.enabled }
    });
    return { setting };
  });
}
