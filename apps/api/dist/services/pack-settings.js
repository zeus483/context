import { prisma } from "../prisma";
import { contentStore } from "./content-store";
let cache = null;
const TTL_MS = 30_000;
export async function getEnabledPackIds() {
    if (cache && cache.expiresAt > Date.now())
        return cache.ids;
    const settings = await prisma.packSetting.findMany();
    if (!settings.length) {
        cache = { ids: contentStore.packIds, expiresAt: Date.now() + TTL_MS };
        return cache.ids;
    }
    const enabled = settings.filter((s) => s.enabled).map((s) => s.packId);
    const ids = enabled.length ? enabled : contentStore.packIds;
    cache = { ids, expiresAt: Date.now() + TTL_MS };
    return ids;
}
