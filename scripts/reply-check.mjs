#!/usr/bin/env node
// Checks one reply against Phronesis's shape rules, with no model call and no tokens.
//   node scripts/reply-check.mjs [--task task.json] < reply.txt
// task.json may set: answer_line1 (regex), needs_certainty, needs_estimate,
// expects_next_action (true to require), expects_confirmation, deliverable_only,
// required and forbidden regex lists. These are format and pattern checks, not a
// semantic correctness judge. Prints one line per check; exits 1 on failure.

import fs from 'node:fs';
import { measure, shapeChecks } from '../bench/lib/metrics.mjs';

const i = process.argv.indexOf('--task');
const task = i > -1 ? JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')) : {};
const text = fs.readFileSync(0, 'utf8');
if (!text.trim()) {
  console.error('reply-check: empty input');
  process.exit(2);
}
const metrics = measure(text, task);
const checks = shapeChecks(metrics);
if (task.required?.length) checks.requiredPatterns = metrics.requiredMissing.length === 0;
if (task.forbidden?.length) checks.noForbiddenPatterns = metrics.forbiddenHits.length === 0;
for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'pass' : 'FAIL'}  ${name}`);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
