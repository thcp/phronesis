import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { applyPlan, previewPlan, rollbackPlan, sha256 } from '../setup-plan.mjs';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'phr-plan-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const file = (p, content, before = null) => ({ path: p, content, beforeSha256: before });
const plan = (files, checks = []) => ({ version: 1, files, checks });
const nodeCheck = (code) => ({ argv: [process.execPath, '-e', code] });

test('preview is read-only; apply is idempotent and rollback restores content and permissions', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'old\n', { mode: 0o644 });
  const p = plan([file('CLAUDE.md', 'new\n', sha256('old\n')), file('.claude/rules/style.md', 'style\n')]);
  assert.ok(previewPlan(root, p).every((r) => r.changed));
  assert.equal(fs.existsSync(path.join(root, '.claude')), false);
  const result = applyPlan(root, p);
  assert.equal(result.status, 'applied');
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'new\n');
  assert.equal(applyPlan(root, p).status, 'unchanged');
  rollbackPlan(root, result.transaction);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'old\n');
  assert.equal(fs.existsSync(path.join(root, '.claude/rules/style.md')), false);
  if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(root, 'CLAUDE.md')).mode & 0o777, 0o644);
  assert.equal(rollbackPlan(root, result.transaction).status, 'rolled-back');
});

test('all conflicts are checked before any plan file is changed', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'user edits');
  const p = plan([file('.claude/settings.json', '{}'), file('CLAUDE.md', 'new', sha256('old'))]);
  assert.throws(() => applyPlan(root, p), /Conflict/);
  assert.equal(fs.existsSync(path.join(root, '.claude/settings.json')), false);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'user edits');
});

test('verification is explicit and its failure rolls back setup files', (t) => {
  const root = fixture(t);
  const p = plan([file('CLAUDE.md', 'new')], [nodeCheck('process.exit(1)')]);
  assert.equal(applyPlan(root, p).verification, 'not run');
  fs.unlinkSync(path.join(root, 'CLAUDE.md'));
  assert.throws(() => applyPlan(root, p, { verify: true }), /verification command failed; setup files rolled back/);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
});

test('verification also runs on an already-applied plan and preserves other side effects', (t) => {
  const root = fixture(t);
  const p = plan([file('CLAUDE.md', 'new')], [nodeCheck("require('node:fs').writeFileSync('check-ran.txt', 'yes')")]);
  applyPlan(root, p);
  assert.equal(fs.existsSync(path.join(root, 'check-ran.txt')), false);
  const result = applyPlan(root, p, { verify: true });
  assert.equal(result.verification[0].passed, true);
  rollbackPlan(root, result.transaction);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'new');
  assert.equal(fs.readFileSync(path.join(root, 'check-ran.txt'), 'utf8'), 'yes');
});

test('rollback preflights every file and preserves subsequent maintainer edits', (t) => {
  const root = fixture(t);
  const result = applyPlan(root, plan([file('CLAUDE.md', 'new'), file('.claude/settings.json', '{}')]));
  fs.writeFileSync(path.join(root, '.claude/settings.json'), '{"custom":true}');
  assert.throws(() => rollbackPlan(root, result.transaction), /Rollback conflict/);
  assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'new');
  assert.equal(fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'), '{"custom":true}');
});

test('path traversal, secrets, non-Claude files, reserved state and overlapping paths are rejected', (t) => {
  const root = fixture(t);
  for (const p of ['../CLAUDE.md', '/CLAUDE.md', 'src/app.mjs', '.claude/../CLAUDE.md', '.claude/.env', '.claude/phronesis-state/a', '.claude/a\\b']) {
    assert.throws(() => applyPlan(root, plan([file(p, 'bad')])));
  }
  assert.throws(() => previewPlan(root, plan([file('.claude/a', 'x'), file('.claude/a/b', 'y')])), /Overlapping/);
  assert.throws(() => previewPlan(root, plan([{ path: 'CLAUDE.md', content: 'x' }])) , /beforeSha256/);
});

test('symlink parents and state directories cannot escape the repository', (t) => {
  if (process.platform === 'win32') { t.skip('Windows symlink creation requires privileges'); return; }
  const root = fixture(t);
  const outside = fixture(t);
  fs.symlinkSync(outside, path.join(root, '.claude'), 'dir');
  assert.throws(() => applyPlan(root, plan([file('.claude/settings.json', '{}')])), /Symlinks/);
  assert.equal(fs.existsSync(path.join(outside, 'phronesis-state')), false);
});

test('pending journal can recover a process interrupted after file writes', (t) => {
  const root = fixture(t);
  const result = applyPlan(root, plan([file('CLAUDE.md', 'new')]));
  const filePath = path.join(root, '.claude/phronesis-state/transactions', `${result.transaction}.json`);
  const journal = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  journal.status = 'pending';
  fs.writeFileSync(filePath, JSON.stringify(journal));
  rollbackPlan(root, result.transaction);
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
});

test('CLI defaults to preview and refuses --verify without --apply', (t) => {
  const root = fixture(t);
  const p = path.join(root, 'plan.json');
  fs.writeFileSync(p, JSON.stringify(plan([file('CLAUDE.md', 'new')])));
  const script = path.resolve('skills/phronesis-audit/scripts/setup-plan.mjs');
  const preview = spawnSync(process.execPath, [script, root, p], { encoding: 'utf8' });
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).status, 'preview');
  assert.equal(fs.existsSync(path.join(root, 'CLAUDE.md')), false);
  assert.equal(spawnSync(process.execPath, [script, root, p, '--verify']).status, 1);
});
