const stopwords = new Set([
    "de", "la", "el", "los", "las", "y", "o", "a", "en", "un", "una", "que", "por", "para", "con", "es", "lo", "se", "del", "al", "mi", "tu", "su", "sus", "me", "te", "le", "ya", "pero", "si", "no", "muy", "mas", "más", "como", "cuando", "donde", "qué", "quien", "quién", "este", "esta", "eso", "esa"
]);
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-záéíóúñ0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopwords.has(w));
}
function keywordSet(text) {
    return new Set(tokenize(text));
}
function scoreText(text, keywords) {
    const words = tokenize(text);
    let score = 0;
    for (const w of words) {
        if (keywords.has(w))
            score += 1;
    }
    return score;
}
export function pickSuspiciousQuote(runtime) {
    const contexts = runtime.state.contexts;
    if (!contexts)
        return null;
    const aKeywords = keywordSet(contexts.a);
    const bKeywords = keywordSet(contexts.b);
    let best = null;
    for (const [promptId, answers] of Object.entries(runtime.answers)) {
        for (const [playerId, text] of Object.entries(answers)) {
            const role = runtime.state.roles?.[playerId] || "NORMAL";
            const score = role === "NORMAL" ? scoreText(text, bKeywords) : scoreText(text, aKeywords);
            if (!best || score > best.score) {
                best = { score, quote: text, authorId: playerId };
            }
        }
    }
    for (const msg of runtime.chat) {
        const role = runtime.state.roles?.[msg.authorId] || "NORMAL";
        const score = role === "NORMAL" ? scoreText(msg.text, bKeywords) : scoreText(msg.text, aKeywords);
        if (!best || score > best.score) {
            best = { score, quote: msg.text, authorId: msg.authorId };
        }
    }
    return best;
}
