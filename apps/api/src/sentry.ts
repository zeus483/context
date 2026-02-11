import * as Sentry from "@sentry/node";
import { config } from "./config";

export function initSentry() {
  if (!config.sentryDsn) return;
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.nodeEnv,
    tracesSampleRate: 0.2
  });
}

export { Sentry };
