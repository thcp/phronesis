import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { agentsFile, hookContext, parseArm } from '../lib/arms.mjs';

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

test('an arm ships its subagents as --agents JSON with model and effort', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phr-agents-'));
  fs.mkdirSync(path.join(dir, 'agents'));
  fs.writeFileSync(path.join(dir, 'agents', 'scout.md'), '---\nname: scout\ndescription: Finds files.\ntools: Read, Grep, Glob\nmodel: haiku\neffort: low\n---\n\nSearch and quote.\n');
  const f = agentsFile(parseArm(`p=dir:${dir}`, os.tmpdir()), fs.mkdtempSync(path.join(os.tmpdir(), 'phr-ag-')));
  const agents = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.deepEqual(agents, { scout: { description: 'Finds files.', prompt: 'Search and quote.', tools: ['Read', 'Grep', 'Glob'], model: 'haiku', effort: 'low' } });
  assert.equal(agentsFile(parseArm(`r=dir:${ROOT}`, os.tmpdir()), os.tmpdir()), null);
  assert.equal(agentsFile(parseArm('c=none', os.tmpdir()), os.tmpdir()), null);
});
