import IORedis from "ioredis";
import { appConfig as config } from "./config";

export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null
});
