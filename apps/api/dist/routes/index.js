import { registerHealthRoutes } from "./health";
import { registerHighlightRoutes } from "./highlights";
import { registerContentRoutes } from "./content";
import { registerAdminRoutes } from "./admin";
import { registerDailyRoutes } from "./daily";
import { registerStatsRoutes } from "./stats";
import { registerReportRoutes } from "./reports";
export function registerRoutes(app) {
    registerHealthRoutes(app);
    registerHighlightRoutes(app);
    registerContentRoutes(app);
    registerDailyRoutes(app);
    registerAdminRoutes(app);
    registerStatsRoutes(app);
    registerReportRoutes(app);
}
