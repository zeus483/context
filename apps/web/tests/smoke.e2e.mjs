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

test(
  "smoke: plan switch -> custom plan -> session xp -> weight xp -> checkin recommendation -> quests",
  { timeout: 180_000 },
  async () => {
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

      const planPayload = await page.evaluate(async () => {
        const res = await fetch("/api/plan");
        return res.json();
      });

      assert.ok(planPayload.selector.basePlans.length >= 2, "Debe existir plan playa y plan normal");

      const normalPlan = planPayload.selector.basePlans.find((plan) => plan.kind === "NORMAL") || planPayload.selector.basePlans[0];
      const switchRes = await page.evaluate(async (normalPlanId) => {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "switch", planType: "BASE", planId: normalPlanId })
        });
        return { ok: res.ok, payload: await res.json() };
      }, normalPlan.id);

      assert.equal(switchRes.ok, true, "Debe poder cambiar plan activo");

      const exercisesPayload = await page.evaluate(async () => {
        const res = await fetch("/api/exercises");
        return res.json();
      });

      const exerciseId = exercisesPayload.exercises[0]?.id;
      assert.ok(exerciseId, "Debe existir catálogo de ejercicios");

      const customPayload = await page.evaluate(async (firstExerciseId) => {
        const res = await fetch("/api/custom-plans", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Smoke Custom Plan",
            description: "Plan e2e",
            days: [
              {
                name: "Día Push",
                focus: "Pecho y tríceps",
                cardioDefault: 15,
                isOptional: false,
                exercises: [
                  {
                    exerciseId: firstExerciseId,
                    sets: 3,
                    reps: "8-12",
                    restSeconds: 90
                  }
                ]
              }
            ]
          })
        });

        return { ok: res.ok, payload: await res.json() };
      }, exerciseId);

      assert.equal(customPayload.ok, true, "Debe crear rutina personalizada");
      assert.ok(customPayload.payload.planId, "Debe devolver planId");

      const activateCustom = await page.evaluate(async (planId) => {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "switch", planType: "CUSTOM", planId })
        });
        return { ok: res.ok, payload: await res.json() };
      }, customPayload.payload.planId);

      assert.equal(activateCustom.ok, true, "Debe activar plan personalizado");

      const activeCustomPlan = await page.evaluate(async () => {
        const res = await fetch("/api/plan");
        return res.json();
      });

      const dayId = activeCustomPlan.days[0]?.id;
      assert.ok(dayId, "Plan personalizado activo debe exponer un día");

      const dateKey = await page.evaluate(() => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
      });

      await page.goto(`${BASE_URL}/session/${dayId}?date=${dateKey}&planType=CUSTOM`);
      await page.waitForSelector("h1");
      await page.locator('input[type="checkbox"]').first().check();
      await page.getByRole("button", { name: "Guardar sesión" }).click();

      const statsAfterSession = await page.evaluate(async () => {
        const res = await fetch("/api/gamification/stats");
        return res.json();
      });

      assert.ok(typeof statsAfterSession.xpTotal === "number", "Debe devolver XP total");

      const weightResult = await page.evaluate(async (today) => {
        const before = await fetch("/api/gamification/stats").then((res) => res.json());
        const save = await fetch("/api/weight", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: today, weightKg: 79.8 })
        });
        const after = await fetch("/api/gamification/stats").then((res) => res.json());
        return {
          saveOk: save.ok,
          beforeXp: before.xpTotal,
          afterXp: after.xpTotal
        };
      }, dateKey);

      assert.equal(weightResult.saveOk, true, "Debe registrar peso");
      assert.ok(weightResult.afterXp >= weightResult.beforeXp, "Registrar peso no debe reducir XP");

      const checkinResult = await page.evaluate(async () => {
        const save = await fetch("/api/checkin/weekly", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ effortScore: 6, fatigueFlag: false })
        });
        const recommendation = await fetch("/api/recommendation/weekly").then((res) => res.json());
        return {
          saveOk: save.ok,
          recommendation
        };
      });

      assert.equal(checkinResult.saveOk, true, "Debe guardar check-in semanal");
      assert.ok(checkinResult.recommendation.recommendation, "Debe existir recomendación semanal");

      const questsPayload = await page.evaluate(async () => {
        const res = await fetch("/api/gamification/quests");
        return res.json();
      });

      assert.ok(Array.isArray(questsPayload.daily), "Debe devolver quests diarias");

      await page.goto(`${BASE_URL}/progress`);
      await page.waitForSelector("h2");
    } finally {
      if (browser) {
        await browser.close().catch(() => null);
      }
      server.kill("SIGTERM");
    }
  }
);
