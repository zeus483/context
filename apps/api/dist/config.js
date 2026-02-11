import fs from "fs";
import path from "path";
import { z } from "zod";
function loadEnvFile(filePath) {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const separator = trimmed.indexOf("=");
        if (separator <= 0)
            continue;
        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
const cwdEnv = path.resolve(process.cwd(), ".env");
const rootEnv = path.resolve(process.cwd(), "../../.env");
const envPath = fs.existsSync(cwdEnv) ? cwdEnv : fs.existsSync(rootEnv) ? rootEnv : undefined;
if (envPath) {
    loadEnvFile(envPath);
}
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    USER_TOKEN_SECRET: z.string().min(16),
    PUBLIC_WEB_URL: z.string().min(1).default("http://localhost:3000"),
    API_BASE_URL: z.string().min(1).default("http://localhost:4000"),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
    SENTRY_DSN: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    S3_ENABLED: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.string().optional(),
    LOCAL_STORAGE_PATH: z.string().default("./storage"),
    CHAT_COOLDOWN_MS: z.coerce.number().default(900),
    MAX_CHAT_LENGTH: z.coerce.number().default(240),
    STREAM_CHAT_DELAY_MS: z.coerce.number().default(1500),
    ADMIN_KEY: z.string().optional()
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
const env = parsed.data;
export const config = {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwtSecret: env.JWT_SECRET,
    userTokenSecret: env.USER_TOKEN_SECRET,
    publicWebUrl: env.PUBLIC_WEB_URL,
    apiBaseUrl: env.API_BASE_URL,
    corsOrigin: env.CORS_ORIGIN,
    sentryDsn: env.SENTRY_DSN,
    otelEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    s3: {
        enabled: env.S3_ENABLED === "true",
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        publicUrl: env.S3_PUBLIC_URL
    },
    localStoragePath: env.LOCAL_STORAGE_PATH,
    chatCooldownMs: env.CHAT_COOLDOWN_MS,
    maxChatLength: env.MAX_CHAT_LENGTH,
    streamChatDelayMs: env.STREAM_CHAT_DELAY_MS,
    adminKey: env.ADMIN_KEY
};
