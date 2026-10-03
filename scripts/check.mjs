#!/usr/bin/env node
// Repository checks run by CI and before every commit:
//   1. every tracked JSON file parses;
//   2. every plugin and extension manifest has the same version;
//   3. no decorative characters (em or en dash, curly quotes, arrows, ellipsis, emoji) in
//      tracked text files, because they turn into mojibake in release tooling;
//   4. every relative Markdown link points to a file that exists;
//   5. the skills pass check-setup.mjs with no high findings;
//   6. every eval case has a prompt and a grader, and nothing in evals/ trips leak-check.mjs.
// Plain Node, no packages. Exits 1 when any check fails.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['-C', ROOT, 'ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && fs.existsSync(path.join(ROOT, f)));
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

// 1. JSON
for (const f of files.filter((f) => f.endsWith('.json'))) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  } catch (e) {
    fail(f, `invalid JSON (${e.message})`);
  }
}

// 2. Versions
const MANIFESTS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'gemini-extension.json', 'qwen-extension.json', 'kimi.plugin.json'];
const versions = Object.fromEntries(MANIFESTS.map((f) => [f, JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).version]));
if (new Set(Object.values(versions)).size !== 1) fail('manifests', `versions differ: ${JSON.stringify(versions)}`);

// 3. Decorative characters
const DECOR = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2190-\u21FF]|\p{Extended_Pictographic}/u;
for (const f of files.filter((f) => /\.(md|mjs|js|json|ya?ml|txt)$/.test(f))) {
  fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => {
    if (DECOR.test(line)) fail(`${f}:${i + 1}`, `decorative character "${line.match(DECOR)[0]}"`);
  });
}

// 4. Relative Markdown links
for (const f of files.filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target)) continue;
    if (!fs.existsSync(path.resolve(ROOT, path.dirname(f), target))) fail(f, `broken link ${target}`);
  }
}

// 5. Skills
const res = spawnSync('node', [path.join(ROOT, 'skills/phronesis-audit/scripts/check-setup.mjs'), ROOT, '--json'], { encoding: 'utf8' });
for (const finding of JSON.parse(res.stdout).findings.filter((x) => x.severity === 'high')) fail(finding.file || 'skills', finding.message);

// 6. Evals
const evalsDir = path.join(ROOT, 'evals');
if (fs.existsSync(evalsDir)) {
  for (const c of fs.readdirSync(evalsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'results')) {
    const dir = path.join(evalsDir, c.name);
    if (!fs.existsSync(path.join(dir, 'prompt.md'))) fail(`evals/${c.name}`, 'no prompt.md');
    const graders = path.join(dir, 'graders');
    if (!fs.existsSync(graders) || !fs.readdirSync(graders).some((f) => f.endsWith('.md'))) fail(`evals/${c.name}`, 'no grader in graders/');
  }
  const leak = spawnSync('node', [path.join(ROOT, 'scripts/leak-check.mjs'), evalsDir], { encoding: 'utf8' });
  if (leak.status !== 0) for (const l of leak.stdout.split('\n').filter(Boolean)) fail('evals', `possible private detail: ${l}`);
}

if (errors.length) {
  console.error(`check: ${errors.length} problem(s)\n${errors.map((e) => `- ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`check: ok (${files.length} files)`);
