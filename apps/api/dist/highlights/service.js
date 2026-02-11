import { nanoid } from "nanoid";
import { prisma } from "../prisma";
import { highlightQueue } from "../queues";
import { pickSuspiciousQuote } from "./heuristics";
export async function createRoundHighlight(runtime, roundId, gameId) {
    const suspicious = pickSuspiciousQuote(runtime);
    const author = runtime.state.players.find((p) => p.id === suspicious?.authorId);
    const title = author ? `Frase sospechosa de ${author.nickname}` : "Frase sospechosa";
    const quote = suspicious?.quote || "Sin frase destacada";
    const slug = nanoid(10);
    const metadata = {
        contexts: runtime.state.contexts,
        round: runtime.state.currentRound,
        votes: runtime.votes
    };
    const highlight = await prisma.highlight.create({
        data: {
            gameId,
            roundId,
            title,
            quote,
            publicSlug: slug,
            metadata
        }
    });
    await highlightQueue.add("render", { highlightId: highlight.id });
    return highlight;
}
export async function createGameHighlight(runtime, gameId, winner) {
    const slug = nanoid(10);
    const title = winner === "INFILTRATOR" ? "El infiltrado sobrevivió" : "El equipo acertó";
    const quote = `Resultado final: ${winner === "INFILTRATOR" ? "Infiltrado gana" : "Equipo normal gana"}`;
    const metadata = {
        contexts: runtime.state.contexts,
        final: true,
        scores: runtime.state.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score }))
    };
    const highlight = await prisma.highlight.create({
        data: {
            gameId,
            title,
            quote,
            publicSlug: slug,
            metadata
        }
    });
    await highlightQueue.add("render", { highlightId: highlight.id });
    return highlight;
}
