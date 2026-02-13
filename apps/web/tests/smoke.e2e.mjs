import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const SHOULD_RUN = process.env.E2E_RUN === "1";

async function waitForServer(url, timeoutMs = 60_000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error("Servidor no disponible para e2e");
}

test("smoke: login -> sesión -> calendario", { timeout: 120_000 }, async () => {
  if (!SHOULD_RUN) {
    assert.ok(true, "Smoke e2e omitido (define E2E_RUN=1 para ejecutarlo)");
    return;
  }

  const server = spawn("pnpm", ["--filter", "@cc/web", "dev"], { stdio: "ignore" });
  let browser;

  try {
    await waitForServer(BASE_URL);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/today/);

    const dayId = await page.evaluate(async () => {
      const res = await fetch("/api/plan");
      const payload = await res.json();
      return payload.days[0]?.id;
    });

    assert.ok(dayId, "Debe existir al menos un día de entrenamiento");

    const dateKey = await page.evaluate(() => {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    });

    await page.goto(`${BASE_URL}/session/${dayId}?date=${dateKey}`);
    await page.waitForSelector("h1");

    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.getByRole("button", { name: "Guardar sesión" }).click();

    await page.goto(`${BASE_URL}/calendar`);
    await page.waitForSelector("h1");
    const calendarTitle = await page.textContent("h1");
    assert.ok(calendarTitle?.toLowerCase().includes("calendario"));

    await browser.close();
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
    server.kill("SIGTERM");
  }
});
