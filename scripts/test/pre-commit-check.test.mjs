import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { CHECKS, isGitCommit, main } from '../pre-commit-check.mjs';

const payload = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

test('isGitCommit finds a commit in any segment and ignores other git commands', () => {
  for (const c of [
    'git commit -m "x"',
    'git -C repo commit -m x',
    'git -c user.name=a commit',
    'GIT_EDITOR=true git commit',
    'node scripts/check.mjs && git commit -q -m x',
  ]) assert.ok(isGitCommit(c), c);
  for (const c of ['git status', 'git log --grep commit', 'echo git commit', 'git push', '', undefined]) {
    assert.ok(!isGitCommit(c), String(c));
  }
});

test('main allows non-commit commands and unparseable payloads without running checks', () => {
  const run = () => assert.fail('checks must not run');
  assert.equal(main(payload('git status'), run), 0);
  assert.equal(main('not json', run), 0);
  assert.equal(main('{}', run), 0);
});

test('main runs every check on a commit and blocks with exit 2 on the first failure', () => {
  const seen = [];
  assert.equal(main(payload('git commit -m x'), (args) => (seen.push(args), { status: 0 })), 0);
  assert.deepEqual(seen, CHECKS.map(([, args]) => args));

  const calls = [];
  const fail = (args) => (calls.push(args), { status: 1, stdout: 'check: 1 problem', stderr: '' });
  const err = process.stderr.write;
  let text = '';
  process.stderr.write = (s) => ((text += s), true);
  try {
    assert.equal(main(payload('git commit -m x'), fail), 2);
  } finally {
    process.stderr.write = err;
  }
  assert.equal(calls.length, 1);
  assert.match(text, /BLOCKED: repository checks failed \(exit 1\)/);
  assert.match(text, /check: 1 problem/);
});

test('the script exits 0 for a non-commit payload when run as a hook', () => {
  const r = spawnSync(process.execPath, ['scripts/pre-commit-check.mjs'], { input: payload('git status'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
