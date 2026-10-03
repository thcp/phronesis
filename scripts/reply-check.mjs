#!/usr/bin/env node
// Checks one reply against Phronesis's shape rules, with no model call and no tokens.
//   node scripts/reply-check.mjs [--task task.json] < reply.txt
// task.json may set: answer_line1 (regex), needs_certainty, needs_estimate,
// expects_next_action (false to skip), expects_confirmation, deliverable_only.
// Prints one line per check and exits 1 when any check fails.

import fs from 'node:fs';
import { measure, shapeChecks } from '../bench/lib/metrics.mjs';

const i = process.argv.indexOf('--task');
const task = i > -1 ? JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')) : {};
const text = fs.readFileSync(0, 'utf8');
if (!text.trim()) {
  console.error('reply-check: empty input');
  process.exit(2);
}
const checks = shapeChecks(measure(text, task));
for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'pass' : 'FAIL'}  ${name}`);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
