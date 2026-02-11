import { prisma } from "../prisma";
export function registerReportRoutes(app) {
    app.post("/api/reports", async (req) => {
        const body = req.body;
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
