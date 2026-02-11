import { prisma } from "../prisma";
import { redis } from "../redis";
export function registerHealthRoutes(app) {
    app.get("/healthz", async () => ({ ok: true }));
    app.get("/readyz", async () => {
        try {
            await prisma.$queryRaw `SELECT 1`;
            await redis.ping();
            return { ok: true };
        }
        catch (err) {
            app.log.error(err);
            return { ok: false };
        }
    });
}
