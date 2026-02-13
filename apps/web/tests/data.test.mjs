import test from 'node:test';
import assert from 'node:assert/strict';

function beachProgress(goalDate) {
  const left = Math.ceil((goalDate.getTime() - Date.now()) / 86400000);
  return Math.max(0, Math.min(100, Math.round(((56 - left) / 56) * 100)));
}

test('progress bounded', () => {
  const pct = beachProgress(new Date(Date.now() + 30 * 86400000));
  assert.ok(pct >= 0 && pct <= 100);
});
