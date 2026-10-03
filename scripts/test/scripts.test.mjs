import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findings, parseDeny, rules, scrub } from '../leak-check.mjs';

const run = (file, args, input) => spawnSync('node', [file, ...args], { input, encoding: 'utf8' });

test('reply-check passes a direct reply and fails a padded one', () => {
  const ok = run('scripts/reply-check.mjs', [], 'The server uses port 8443.\n');
  assert.equal(ok.status, 0, ok.stdout);
  const bad = run('scripts/reply-check.mjs', [], 'Great question! Let me explain.\nIt uses 8443 ' + String.fromCharCode(0x2014) + ' fine.');
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL {2}noPreamble/);
});

test('leak-check finds generic patterns with no list', () => {
  const list = rules({ cwd: os.tmpdir() });
  const text = 'mail a@b.example, ip 10.1.2.3, key ghp_abcdefghijklmnopqrstuvwx, file cf.creds';
  const labels = findings(text, list).map((f) => f.label);
  for (const l of ['email address', 'IP address', 'token', 'credential file name']) assert.ok(labels.includes(l), l);
});

test('leak-check finds this machine at run time and uses a supplied list', () => {
  const user = os.userInfo().username;
  const list = rules({ cwd: os.tmpdir(), deny: 'zzz-secret-term\n# comment\n/proj-\\d+/' });
  const labels = findings(`path ${os.homedir()}/x by ${user}; zzz-secret-term; proj-42`, list).map((f) => f.label);
  assert.ok(labels.includes('home directory'));
  assert.ok(labels.includes('custom-deny-1'));
  assert.ok(labels.includes('custom-deny-2'));
});

test('leak-check scrub replaces findings and leaves clean text alone', () => {
  const list = rules({ cwd: os.tmpdir(), deny: 'acme-internal' });
  assert.equal(scrub('see acme-internal now', list), 'see [custom-deny-1] now');
  assert.equal(scrub('nothing private here', list), 'nothing private here');
  assert.deepEqual(parseDeny('# only a comment\n'), []);
});

test('the shipped eval cases contain nothing the generic detectors flag', () => {
  const r = run('scripts/leak-check.mjs', ['evals'], '');
  assert.equal(r.status, 0, r.stdout);
});

test('leak-check treats the plugin own name as public', () => {
  const names = rules({ cwd: process.cwd() }).map(([label]) => label);
  assert.ok(!names.includes('git repository name'));
});

test('leak-check skips git-ignored files and reports the rest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leak-'));
  const script = path.resolve('scripts/leak-check.mjs');
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(path.join(dir, '.gitignore'), 'ignored/\n');
  fs.mkdirSync(path.join(dir, 'ignored'));
  fs.writeFileSync(path.join(dir, 'ignored', 'a.txt'), 'mail a@b.example\n');
  fs.writeFileSync(path.join(dir, 'shared.txt'), 'mail a@b.example\n');
  const skip = spawnSync('node', [script, 'ignored'], { cwd: dir, encoding: 'utf8' });
  assert.equal(skip.status, 0, skip.stdout);
  const found = spawnSync('node', [script, 'shared.txt'], { cwd: dir, encoding: 'utf8' });
  assert.equal(found.status, 1);
  assert.match(found.stdout, /email address/);
});

// Both report and scrub output may be shared; neither can repeat a deny value.
test('custom deny values never appear in CLI output, including parser errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phr-redact-'));
  const deny = path.join(dir, 'deny.txt');
  const input = path.join(dir, 'input.txt');
  fs.writeFileSync(deny, 'fictional-confidential-value\n/fictional-pattern-[a-z]+/i');
  fs.writeFileSync(input, 'fictional-confidential-value fictional-pattern-xyz');
  for (const args of [[], ['--scrub']]) {
    const result = run('scripts/leak-check.mjs', ['--deny', deny, ...args, input]);
    assert.equal(result.status, args.length ? 0 : 1);
    assert.match(result.stdout, /custom-deny-/);
    assert.doesNotMatch(result.stdout + result.stderr, /fictional-confidential|fictional-pattern/);
  }
  fs.writeFileSync(deny, '/fictional-private(/');
  const invalid = run('scripts/leak-check.mjs', ['--deny', deny, input]);
  assert.equal(invalid.status, 2);
  assert.doesNotMatch(invalid.stdout + invalid.stderr, /fictional-private/);
  fs.unlinkSync(deny);
  assert.equal(run('scripts/leak-check.mjs', ['--deny', deny, input]).status, 2);
});

test('reply-check enforces only explicitly requested next actions and patterns', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phr-reply-'));
  const task = path.join(dir, 'task.json');
  fs.writeFileSync(task, JSON.stringify({ expects_next_action: true }));
  assert.equal(run('scripts/reply-check.mjs', ['--task', task], 'Port 8443.').status, 1);
  fs.writeFileSync(task, JSON.stringify({ required: [{ label: 'port', regex: '8443' }] }));
  assert.equal(run('scripts/reply-check.mjs', ['--task', task], 'Port 9000.').status, 1);
});
