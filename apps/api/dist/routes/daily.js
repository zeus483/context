import { prisma } from "../prisma";
import { contentStore } from "../services/content-store";
import { getDailyContextPair } from "../content";
import { getEnabledPackIds } from "../services/pack-settings";
function dateKey(date) {
    return date.toISOString().slice(0, 10);
}
export function registerDailyRoutes(app) {
    app.get("/api/daily", async () => {
        const today = new Date();
        const key = dateKey(today);
        let daily = await prisma.dailyChallenge.findUnique({ where: { date: key } });
        if (!daily) {
            const allowedPackIds = await getEnabledPackIds();
            const packId = allowedPackIds[Math.floor(Math.random() * allowedPackIds.length)];
            daily = await prisma.dailyChallenge.create({ data: { date: key, seed: `cc-${key}`, packId } });
        }
        const allowedPackIds = await getEnabledPackIds();
        const pair = getDailyContextPair(contentStore, daily.seed, daily.packId || undefined, allowedPackIds);
        return { date: key, packId: daily.packId, pair };
    });
}
