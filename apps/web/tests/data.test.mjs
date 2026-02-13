import test from "node:test";
import assert from "node:assert/strict";

function beachProgress(goalDate) {
  const left = Math.ceil((goalDate.getTime() - Date.now()) / 86400000);
  return Math.max(0, Math.min(100, Math.round(((56 - left) / 56) * 100)));
}

function compliancePercent(statuses) {
  const planned = statuses.filter((x) => x !== "REST").length;
  if (!planned) return 100;
  const done = statuses.filter((x) => x === "DONE" || x === "PARTIAL").length;
  return Math.round((done / planned) * 100);
}

test("beachProgress bounded", () => {
  const pct = beachProgress(new Date(Date.now() + 30 * 86400000));
  assert.ok(pct >= 0 && pct <= 100);
});

test("compliance excludes rest days", () => {
  const pct = compliancePercent(["DONE", "REST", "PARTIAL", "MISSED"]);
  assert.equal(pct, 67);
});
