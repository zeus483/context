import { prisma } from "../prisma";
function bogotaRange() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    const start = new Date(`${y}-${m}-${d}T00:00:00-05:00`);
    const end = new Date(`${y}-${m}-${d}T23:59:59-05:00`);
    return { start, end };
}
export function registerStatsRoutes(app) {
    app.get("/api/stats/leaderboard/daily", async () => {
        const { start, end } = bogotaRange();
        const entries = await prisma.gamePlayer.findMany({
            where: { createdAt: { gte: start, lte: end } },
            orderBy: { score: "desc" },
            take: 50
        });
        return { entries };
    });
    app.get("/api/stats/profile", async (req) => {
        const { userId, guestId } = req.query;
        if (!userId && !guestId)
            return { games: 0, wins: 0, streak: 0 };
        const entries = await prisma.gamePlayer.findMany({
            where: {
                ...(userId ? { userId } : {}),
                ...(guestId ? { guestId } : {})
            },
            include: { game: true }
        });
        let wins = 0;
        const days = new Set();
        for (const entry of entries) {
            if (entry.game.winnerSide === entry.role)
                wins += 1;
            const day = entry.createdAt.toISOString().slice(0, 10);
            days.add(day);
        }
        const sortedDays = Array.from(days).sort();
        let streak = 0;
        if (sortedDays.length) {
            const todayKey = new Date().toISOString().slice(0, 10);
            let current = todayKey;
            while (days.has(current)) {
                streak += 1;
                const d = new Date(current);
                d.setDate(d.getDate() - 1);
                current = d.toISOString().slice(0, 10);
            }
        }
        return { games: entries.length, wins, streak };
    });
}
