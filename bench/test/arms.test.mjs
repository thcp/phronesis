import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { hookContext, parseArm } from '../lib/arms.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Regression: injected text that changed per run (a fresh temporary flag path) defeated
// the prompt cache and inflated every Phronesis arm's cost.
test('hook context is identical across runs', () => {
  const arm = parseArm(`a=dir:${ROOT}`, fs.mkdtempSync(path.join(os.tmpdir(), 'phr-arm-')));
  const first = hookContext(arm, 'SessionStart', {});
  assert.match(first, /always-on core/);
  assert.equal(hookContext(arm, 'SessionStart', {}), first);
  assert.equal(hookContext(arm, 'UserPromptSubmit', { prompt: 'x' }), hookContext(arm, 'UserPromptSubmit', { prompt: 'y' }));
});

test('the control arm injects nothing', () => {
  assert.equal(hookContext(parseArm('c=none', os.tmpdir()), 'SessionStart', {}), '');
});

test('hooks declared inline in .claude-plugin/plugin.json are run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phr-plugin-'));
  fs.mkdirSync(path.join(dir, '.claude-plugin'));
  fs.writeFileSync(path.join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({
    name: 'x',
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'node -e "process.stdout.write(\'inline rules\')"' }] }] },
  }));
  assert.equal(hookContext(parseArm(`x=dir:${dir}`, os.tmpdir()), 'SessionStart', {}), 'inline rules');
});
