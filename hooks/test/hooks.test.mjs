// Runs each hook the way Claude Code does (through the command in hooks/hooks.json)
// and checks what it adds to context. Works on Windows, macOS and Linux.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'phr-test-'));

function run(event, index, { config, project }) {
  const hook = HOOKS[event][index].hooks[0];
  const res = spawnSync(hook.command, {
    shell: true,
    input: JSON.stringify({ hook_event_name: event, source: 'startup', prompt: 'hi', cwd: project }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: ROOT, CLAUDE_CONFIG_DIR: config, CLAUDE_PROJECT_DIR: project },
    encoding: 'utf8',
  });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout;
}

function gitRepo() {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.git'));
  return dir;
}

function withFlag() {
  const config = tmp();
  fs.writeFileSync(path.join(config, '.phronesis-always'), '');
  return config;
}

test('always-on: silent without the flag', () => {
  assert.equal(run('SessionStart', 0, { config: tmp(), project: tmp() }), '');
});

test('always-on: injects the core, not the full skill', () => {
  const out = run('SessionStart', 0, { config: withFlag(), project: tmp() });
  assert.match(out, /Phronesis is on for every reply/);
  assert.match(out, /always-on core/);
  assert.ok(out.length < 3500, `core is ${out.length} chars`);
  assert.doesNotMatch(out, /^---/m, 'frontmatter must not leak');
});

test('reminder: silent without the flag, one short line with it', () => {
  assert.equal(run('UserPromptSubmit', 0, { config: tmp(), project: tmp() }), '');
  const out = run('UserPromptSubmit', 0, { config: withFlag(), project: tmp() });
  assert.match(out, /^Phronesis reminder:/);
  assert.ok(out.length < 300);
});

test('first-run: silent outside a git repository', () => {
  assert.equal(run('SessionStart', 1, { config: tmp(), project: tmp() }), '');
});

test('first-run: offers in an undecided git repository, with a snooze date', () => {
  const out = run('SessionStart', 1, { config: tmp(), project: gitRepo() });
  assert.match(out, /first-run offer/);
  assert.match(out, /"scan":"snoozed","until":"\d{4}-\d{2}-\d{2}"/);
});

test('first-run: silent once decided, offers again after a snooze ends', () => {
  const write = (state) => {
    const project = gitRepo();
    fs.mkdirSync(path.join(project, '.claude'));
    fs.writeFileSync(path.join(project, '.claude', 'phronesis.json'), JSON.stringify(state));
    return run('SessionStart', 1, { config: tmp(), project });
  };
  assert.equal(write({ scan: 'done' }), '');
  assert.equal(write({ scan: 'never' }), '');
  assert.equal(write({ scan: 'snoozed', until: '2999-01-01' }), '');
  assert.match(write({ scan: 'snoozed', until: '2000-01-01' }), /first-run offer/);
});

test('first-run: a lock file counts as a decision', () => {
  const project = gitRepo();
  fs.mkdirSync(path.join(project, '.claude'));
  fs.writeFileSync(path.join(project, '.claude', 'phronesis-lock.json'), '{}');
  assert.equal(run('SessionStart', 1, { config: tmp(), project }), '');
});
