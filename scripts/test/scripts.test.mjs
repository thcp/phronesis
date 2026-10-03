import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import test from 'node:test';
import { findings, parseDeny, rules, scrub } from '../leak-check.mjs';

const run = (file, args, input) => spawnSync('node', [file, ...args], { input, encoding: 'utf8' });

test('reply-check passes a direct reply and fails a padded one', () => {
  const ok = run('scripts/reply-check.mjs', [], 'The server uses port 8443.\n\n**Next (recommended):** none.');
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
  assert.ok(labels.some((l) => l.includes('zzz-secret-term')));
  assert.ok(labels.some((l) => l.includes('proj-')));
});

test('leak-check scrub replaces findings and leaves clean text alone', () => {
  const list = rules({ cwd: os.tmpdir(), deny: 'acme-internal' });
  assert.equal(scrub('see acme-internal now', list), 'see [list entry acme-internal] now');
  assert.equal(scrub('nothing private here', list), 'nothing private here');
  assert.deepEqual(parseDeny('# only a comment\n'), []);
});

test('the shipped eval cases contain nothing the generic detectors flag', () => {
  const r = run('scripts/leak-check.mjs', ['evals'], '');
  assert.equal(r.status, 0, r.stdout);
});

test('leak-check treats the plugin own name as public and skips git-ignored files', () => {
  const names = rules({ cwd: process.cwd() }).map(([label]) => label);
  assert.ok(!names.includes('git repository name'));
  const r = run('scripts/leak-check.mjs', ['evals/results'], '');
  assert.equal(r.status, 0, r.stdout);
});
