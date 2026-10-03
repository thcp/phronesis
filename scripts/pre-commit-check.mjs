#!/usr/bin/env node
// PreToolUse hook logic: before Claude Code runs `git commit` in this repo, run the repository
// checks and the node tests, and block the commit when either fails.
//
// Reads the hook payload as JSON on stdin. Exit 0 allows the command; exit 2 blocks it and
// shows stderr to Claude. A payload that cannot be parsed is allowed, so a hook bug never
// blocks work.
//
// Why this lives in scripts/ and not .claude/: .claude/ stays uncommitted in this repo, so
// each machine adds .claude/hooks/pre-commit-check.mjs with these two lines:
//   import { cli } from '../../scripts/pre-commit-check.mjs';
//   cli();

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const CHECKS = [
  ['repository checks', ['scripts/check.mjs']],
  [
    'tests',
    [
      '--test',
      '--test-reporter=dot',
      'hooks/test/*.test.mjs',
      'skills/phronesis-audit/scripts/test/*.test.mjs',
      'bench/test/*.test.mjs',
      'scripts/test/*.test.mjs',
    ],
  ],
];

// Split a command line into the segments a shell would run separately.
const SEGMENTS = /&&|\|\||[;|\n]/;

// True when one segment of the command is `git [-C dir] [-c k=v] [--opt] commit ...`,
// after leading VAR=value assignments.
export function isGitCommit(command) {
  for (const segment of String(command).split(SEGMENTS)) {
    let toks = segment.trim().split(/\s+/).filter(Boolean);
    while (toks.length && /^[A-Za-z_]\w*=/.test(toks[0])) toks = toks.slice(1);
    if (toks[0] !== 'git') continue;
    let i = 1;
    while (i < toks.length && toks[i].startsWith('-')) i += toks[i] === '-C' || toks[i] === '-c' ? 2 : 1;
    if (toks[i] === 'commit') return true;
  }
  return false;
}

const runNode = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });

// Returns the exit code for one hook payload. `run` is replaceable for tests.
export function main(input, run = runNode) {
  let command;
  try {
    command = JSON.parse(input)?.tool_input?.command;
  } catch {
    return 0;
  }
  if (!isGitCommit(command)) return 0;
  for (const [name, args] of CHECKS) {
    const r = run(args);
    if (r.status !== 0) {
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-30).join('\n');
      process.stderr.write(
        `BLOCKED: ${name} failed (exit ${r.status}) for \`node ${args.join(' ')}\`.\n\n${out}\n\n` +
          'Fix the failure, then commit again.\n',
      );
      return 2;
    }
  }
  return 0;
}

export function cli() {
  process.exit(main(fs.readFileSync(0, 'utf8')));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli();
