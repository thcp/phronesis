import assert from 'node:assert/strict';
import test from 'node:test';
import { fitPrices } from '../lib/stats.mjs';

test('fitPrices recovers known prices from billed costs', () => {
  const truth = [10e-6, 0.5e-6, 25e-6];
  const runs = [];
  for (let i = 0; i < 20; i++) {
    const r = { cacheWriteTokens: (i * 997) % 5000, cacheReadTokens: 30000 + ((i * i * 1301) % 40000), outputTokens: 500 + ((i * 37) % 900) };
    r.costUsd = r.cacheWriteTokens * truth[0] + r.cacheReadTokens * truth[1] + r.outputTokens * truth[2];
    runs.push(r);
  }
  const p = fitPrices(runs);
  truth.forEach((t, i) => assert.ok(Math.abs(p[i] - t) / t < 0.01, `price ${i}: ${p[i]} vs ${t}`));
  assert.ok(p.relError < 1e-6);
});

test('fitPrices needs enough runs', () => {
  assert.equal(fitPrices([]), null);
});
