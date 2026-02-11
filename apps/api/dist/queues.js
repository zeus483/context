import { Queue } from "bullmq";
import { redis } from "./redis";
export const highlightQueue = new Queue("highlight-render", {
    connection: redis
});
