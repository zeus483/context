import { Worker } from "bullmq";
import playwright from "playwright";
import { redis } from "../redis";
import { prisma } from "../prisma";
import { uploadHighlightImage } from "../storage";
import { appConfig as config } from "../config";
import { logger } from "../logger";
const { chromium } = playwright;
const worker = new Worker("highlight-render", async (job) => {
    const { highlightId } = job.data;
    const highlight = await prisma.highlight.findUnique({ where: { id: highlightId } });
    if (!highlight)
        return;
    const metadata = (highlight.metadata || {});
    const contexts = metadata.contexts;
    const voteSummary = metadata.votes;
    const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin:0; font-family: 'Inter', 'Segoe UI', sans-serif; background: #0b0b12; color: #f4f4f8; }
      .card { width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: space-between; padding: 48px; box-sizing: border-box; background: radial-gradient(circle at top left, #1b1f3b, #0b0b12 60%); }
      .brand { font-size: 20px; letter-spacing: 0.2em; text-transform: uppercase; color: #8af7a5; }
      .title { font-size: 44px; font-weight: 700; line-height: 1.1; margin: 20px 0; }
      .quote { font-size: 30px; line-height: 1.4; background: rgba(255,255,255,0.06); padding: 24px; border-radius: 16px; }
      .meta { display: flex; justify-content: space-between; margin-top: 20px; font-size: 18px; color: #c2c6ff; }
      .contexts { font-size: 20px; }
      .pill { display:inline-block; background:#8af7a5; color:#050507; padding:6px 12px; border-radius:999px; font-weight:600; margin-right:8px; }
    </style>
  </head>
  <body>
    <div class="card">
      <div>
        <div class="brand">Contexto Cruzado</div>
        <div class="title">${escapeHtml(highlight.title)}</div>
        <div class="quote">“${escapeHtml(highlight.quote)}”</div>
      </div>
      <div class="meta">
        <div class="contexts">
          <span class="pill">A</span>${escapeHtml(contexts?.a || "")}
          <span style="margin: 0 8px;">vs</span>
          <span class="pill">B</span>${escapeHtml(contexts?.b || "")}
        </div>
        <div>${voteSummary ? `Votos: ${Object.keys(voteSummary).length}` : ""}</div>
      </div>
    </div>
  </body>
</html>`;
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    const buffer = await page.screenshot({ type: "png" });
    await browser.close();
    const url = await uploadHighlightImage(buffer, highlight.publicSlug);
    await prisma.highlight.update({ where: { id: highlight.id }, data: { ogImageUrl: url } });
}, {
    connection: redis
});
worker.on("failed", (job, err) => {
    logger.error({ job: job?.id, err }, "highlight render failed");
});
logger.info({ env: config.nodeEnv }, "Highlight worker started");
