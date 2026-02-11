import type { FastifyInstance } from "fastify";
import { contentStore } from "../services/content-store";
import { getEnabledPackIds } from "../services/pack-settings";

export function registerContentRoutes(app: FastifyInstance) {
  app.get("/api/content/packs", async () => {
    const enabled = await getEnabledPackIds();
    return { packs: enabled.length ? enabled : contentStore.packIds };
  });
}
