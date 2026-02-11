import pino from "pino";
import { appConfig as config } from "./config";
export const logger = pino({
    level: config.nodeEnv === "production" ? "info" : "debug",
    base: { service: "contexto-cruzado-api" }
});
