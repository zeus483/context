import type { FastifyInstance } from "fastify";
import { prisma } from "../prisma";

export function registerHighlightRoutes(app: FastifyInstance) {
  app.get("/api/highlights/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const highlight = await prisma.highlight.findUnique({ where: { publicSlug: slug } });
    if (!highlight) {
      return reply.status(404).send({ error: "Not found" });
    }
    return {
      id: highlight.id,
      slug: highlight.publicSlug,
      title: highlight.title,
      quote: highlight.quote,
      ogImageUrl: highlight.ogImageUrl,
      metadata: highlight.metadata
    };
  });
}
