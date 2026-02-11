import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import { config } from "./config";
import { logger } from "./logger";
import { initSentry } from "./sentry";
import { startOtel, shutdownOtel } from "./otel";
import { registerRoutes } from "./routes";
import { registerSockets } from "./sockets";
startOtel();
initSentry();
const app = Fastify({ logger, bodyLimit: 1024 * 20 });
await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true
});
await app.register(helmet, {
    contentSecurityPolicy: false
});
await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute"
});
const storagePath = path.resolve(config.localStoragePath);
fs.mkdirSync(storagePath, { recursive: true });
await app.register(fastifyStatic, {
    root: path.resolve(config.localStoragePath),
    prefix: "/storage/"
});
registerRoutes(app);
const io = new Server(app.server, {
    cors: {
        origin: config.corsOrigin,
        credentials: true
    }
});
registerSockets(io);
const close = async () => {
    await app.close();
    await shutdownOtel();
    process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
await app.listen({ port: config.port, host: "0.0.0.0" });
logger.info({ port: config.port }, "API server listening");
