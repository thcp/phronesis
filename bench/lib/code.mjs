// Code-writing tasks: the agent edits a fresh clone, then the harness measures the diff and
// runs a hidden acceptance test, the full test suite and the type check.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sh = (cmd, args, cwd, timeout = 600000) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });

const isTest = (f) => /(^|\/)(test|tests|__tests__)\/|\.test\.[a-z]+$/.test(f);

// A clone of `repo` that shares `deps` (an installed node_modules) through a symlink,
// so every run starts from the same code without installing packages again.
export function freshClone(repo, ws, deps) {
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(ws), { recursive: true });
  const r = sh('git', ['clone', '--quiet', '--local', '--no-hardlinks', repo, ws], path.dirname(ws));
  if (r.status !== 0) throw new Error(`git clone failed: ${r.stderr}`);
  if (deps) fs.symlinkSync(deps, path.join(ws, 'node_modules'), 'dir');
}

// Lines added and removed, split into source and test files, plus the diff text.
export function diffStats(ws) {
  sh('git', ['add', '-A', '--', '.', ':!node_modules'], ws);
  const numstat = sh('git', ['diff', '--cached', '--numstat'], ws).stdout.trim();
  const stats = { srcLines: 0, testLines: 0, files: 0, srcFiles: 0 };
  for (const line of numstat ? numstat.split('\n') : []) {
    const [a, d, file] = line.split('\t');
    const n = (Number(a) || 0) + (Number(d) || 0);
    stats.files++;
    if (isTest(file)) stats.testLines += n;
    else {
      stats.srcLines += n;
      stats.srcFiles++;
    }
  }
  stats.diff = sh('git', ['diff', '--cached'], ws).stdout.slice(0, 30000);
  return stats;
}

// Adds the hidden acceptance test, runs the whole suite and the type check.
// `baselineFailures` lists test names that already fail before any change.
export function verify(ws, task, acceptDir, baselineFailures) {
  fs.copyFileSync(path.join(acceptDir, task.accept), path.join(ws, task.accept_dest));
  const out = path.join(ws, '.bench-vitest.json');
  sh('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`], ws);
  let failed = [];
  let acceptPassed = false;
  try {
    const r = JSON.parse(fs.readFileSync(out, 'utf8'));
    for (const file of r.testResults || []) {
      const accept = file.name.endsWith(task.accept_dest);
      const results = file.assertionResults || [];
      if (accept) acceptPassed = results.length > 0 && results.every((t) => t.status === 'passed');
      for (const t of results) if (t.status === 'failed' && !accept) failed.push(t.fullName);
      if (!results.length && file.status === 'failed' && !accept) failed.push(file.name);
    }
  } catch {
    failed = ['vitest did not produce a report'];
  }
  const typecheck = sh('npm', ['run', 'typecheck'], ws).status === 0;
  return { acceptPassed, newFailures: failed.filter((f) => !baselineFailures.includes(f)), typecheck };
}
