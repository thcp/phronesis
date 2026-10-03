#!/usr/bin/env node
// Looks for private details in files that are about to be shared. It holds no values of its
// own: it uses generic patterns, values read from this machine at run time, and an optional
// list the user supplies.
//   node scripts/leak-check.mjs [--deny file] [--scrub] <path>...
// --deny file  one term or /regex/ per line; lines starting with # are ignored. The
//              PHRONESIS_DENYLIST environment variable names the same file.
// --scrub      print the files with each finding replaced by a placeholder, instead of
//              reporting; nothing is written to disk.
// Exits 1 when it finds anything (report mode). A pattern list cannot recognise a detail it
// does not know, so this is a second layer: write made-up examples in the first place.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DETECTORS = [
  ['email address', /\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ['token', /\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g],
  ['url with credentials', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/gi],
  ['IP address', /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g],
  ['credential file name', /(?:^|[\s/"'`])(?:\.env(?:\.[\w-]+)?|[\w-]+\.creds|id_rsa|id_ed25519)(?=$|[\s"'`:,.)])/g],
  ['long random string', /\b(?=[A-Za-z0-9+/_-]*\d)(?=[A-Za-z0-9+/_-]*[A-Za-z])[A-Za-z0-9+/_-]{32,}\b/g],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Values that exist only on this machine, found when the script runs.
export function runtimeValues(cwd = process.cwd()) {
  const out = new Set();
  const add = (label, v) => v && v.length >= 3 && out.add(JSON.stringify([label, v]));
  add('home directory', os.homedir());
  try { add('user name', os.userInfo().username); } catch { /* no user info */ }
  add('host name', os.hostname());
  try {
    const url = execFileSync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = url.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
    if (m) { add('git organisation', m[1]); add('git repository name', m[2]); }
  } catch { /* not a git repo or no remote */ }
  try { add('package name', JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')).name); } catch { /* none */ }
  // The name of the plugin under test is public by definition, so it is not a finding.
  let own = null;
  try { own = JSON.parse(fs.readFileSync(path.join(cwd, '.claude-plugin', 'plugin.json'), 'utf8')).name; } catch { /* not a plugin */ }
  return [...out].map((s) => JSON.parse(s)).filter(([, v]) => !own || v.toLowerCase() !== own.toLowerCase());
}

export function parseDeny(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => {
    const m = l.match(/^\/(.+)\/([a-z]*)$/);
    return [`list entry ${l}`, m ? new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g') : new RegExp(esc(l), 'gi')];
  });
}

export function rules({ deny = '', cwd } = {}) {
  const values = runtimeValues(cwd).map(([label, v]) => [label, new RegExp(esc(v), 'gi')]);
  return [...DETECTORS, ...values, ...parseDeny(deny)];
}

export function findings(text, ruleList) {
  const found = [];
  for (const [label, re] of ruleList) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) {
      const line = text.slice(0, m.index).split('\n').length;
      found.push({ label, line });
    }
  }
  return found;
}

export function scrub(text, ruleList) {
  let out = text;
  for (const [label, re] of ruleList) out = out.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), `[${label}]`);
  return out;
}

function walk(p) {
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).flatMap((f) => walk(path.join(p, f)));
  return [p];
}

// Files that git ignores are never shared by git, so they are not reported.
function notIgnored(files) {
  const r = spawnSync('git', ['check-ignore', '--stdin'], { input: files.join('\n'), encoding: 'utf8' });
  const ignored = new Set(r.stdout.split('\n').filter(Boolean));
  return files.filter((f) => !ignored.has(f));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); return i > -1 ? args.splice(i, 2)[1] : null; };
  const denyFile = take('--deny') || process.env.PHRONESIS_DENYLIST || null;
  const doScrub = args.includes('--scrub');
  const targets = args.filter((a) => a !== '--scrub');
  if (!targets.length) { console.error('usage: leak-check.mjs [--deny file] [--scrub] <path>...'); process.exit(2); }
  const deny = denyFile && fs.existsSync(denyFile) ? fs.readFileSync(denyFile, 'utf8') : '';
  const list = rules({ deny });
  let bad = 0;
  for (const f of notIgnored(targets.flatMap(walk))) {
    const text = fs.readFileSync(f, 'utf8');
    if (doScrub) { process.stdout.write(scrub(text, list)); continue; }
    for (const x of findings(text, list)) { console.log(`${f}:${x.line}: ${x.label}`); bad++; }
  }
  if (!doScrub && bad) process.exit(1);
}
