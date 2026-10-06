#!/usr/bin/env node
// Read-only upstream check. Network failures are unknown, never "current".
// node drift-check.mjs [--json] | node drift-check.mjs --hash URL
// Standalone: this file can be copied into a project's hooks without dependencies.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
export function contentHash(html, version = 2) {
  let content = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ');
  if (version === 2) content = content.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1] || content;
  return digest(content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function treeHash(data) {
  if (Array.isArray(data)) {
    // The contents endpoint truncates large directories; do not certify one as current.
    if (data.length >= 1000 || data.some((entry) => !entry.sha || !entry.path || !entry.type)) return null;
    return digest(JSON.stringify(data.map(({ path: p, type, sha }) => [p, type, sha]).sort((a, b) => a[0].localeCompare(b[0]))));
  }
  return data?.sha && data?.type === 'file' ? digest(JSON.stringify(['file', data.sha])) : null;
}

async function get(url, json, fetcher) {
  try {
    const res = await fetcher(url, {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'phronesis-drift-check', Accept: json ? 'application/vnd.github+json' : 'text/html' },
    });
    if (!res.ok) return null;
    return json ? await res.json() : await res.text();
  } catch { return null; }
}

export async function check(lock, { fetcher = fetch, github = 'https://api.github.com', modelsUrl = 'https://platform.claude.com/docs/en/about-claude/models/overview', cached = {} } = {}) {
  const tasks = [];
  const add = (key, run) => tasks.push((async () => [key, cached[key] || await run()])());
  for (const [i, source] of (lock.sources || []).entries()) add(`source-${i}`, async () => {
    if (!/^[\w.-]+\/[\w.-]+$/.test(source.repo) || !source.commit) return { status: 'unknown', reason: 'missing repository or validated commit' };
    const filePath = (source.path || '').split('/').map(encodeURIComponent).join('/');
    const base = `${github}/repos/${source.repo}/contents/${filePath}`;
    // Compare the SAME adopted path at the validated commit and current default branch.
    // A path's last commit may predate the repository HEAD without any actual drift.
    const [before, after] = await Promise.all([
      get(`${base}?ref=${encodeURIComponent(source.commit)}`, true, fetcher), get(base, true, fetcher),
    ]);
    const oldHash = before === null ? null : treeHash(before);
    const newHash = after === null ? null : treeHash(after);
    if (!oldHash || !newHash) return { status: 'unknown', reason: 'path missing, request failed or directory truncated' };
    return { status: oldHash === newHash ? 'current' : 'changed', change: oldHash === newHash ? null : `source ${source.repo}${source.path ? `/${source.path}` : ''}: adopted content changed` };
  });
  for (const [i, doc] of (lock.docs || []).entries()) add(`doc-${i}`, async () => {
    if (!doc.sha256) return { status: 'unknown', reason: 'missing validated document hash' };
    if (doc.hashVersion !== undefined && ![1, 2].includes(doc.hashVersion)) return { status: 'unknown', reason: 'unsupported document hash version' };
    const html = await get(doc.url, false, fetcher);
    if (html === null) return { status: 'unknown', reason: 'document request failed' };
    const changed = contentHash(html, doc.hashVersion || 1) !== doc.sha256;
    return { status: changed ? 'changed' : 'current', change: changed ? `doc ${doc.url}: content changed since ${doc.date || 'validation'}` : null };
  });
  if (lock.models?.length) add('models', async () => {
    const html = await get(modelsUrl, false, fetcher);
    if (html === null) return { status: 'unknown', reason: 'models overview request failed' };
    const missing = lock.models.filter((id) => !html.includes(id));
    return { status: missing.length ? 'unverified' : 'listed', changes: missing.map((id) => `model ${id}: not listed on the overview; availability not verified`) };
  });
  const items = Object.fromEntries(await Promise.all(tasks));
  return { items, changes: Object.values(items).flatMap((item) => item.changes || (item.change ? [item.change] : [])) };
}

export async function runDrift(project, options = {}) {
  const lockFile = path.join(project, '.claude', 'phronesis-lock.json');
  if (!fs.existsSync(lockFile)) return { items: {}, changes: [] };
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  const cacheFile = path.join(project, '.claude', '.phronesis-drift-cache.json');
  const today = options.today || new Date().toISOString().slice(0, 10);
  const identity = digest(JSON.stringify([lock, options.github || '', options.modelsUrl || '']));
  let cache;
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* no cache */ }
  const cached = cache?.checked === today && cache?.identity === identity ? cache.items || {} : {};
  const result = await check(lock, { ...options, cached });
  // Cache only successful observations. Failed pieces are retried even on the same day.
  const items = Object.fromEntries(Object.entries(result.items).filter(([, item]) => item.status !== 'unknown'));
  if (Object.keys(items).length) fs.writeFileSync(cacheFile, JSON.stringify({ checked: today, identity, items }, null, 2));
  return { ...result, validated: lock.validated || 'an unknown date' };
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--hash') {
    const html = await get(args[1], false, fetch);
    process.stdout.write(html === null ? 'not reachable\n' : `${contentHash(html)}\n`);
    return;
  }
  const result = await runDrift(process.env.CLAUDE_PROJECT_DIR || process.cwd(), {
    github: process.env.PHRONESIS_GITHUB_API || 'https://api.github.com',
    modelsUrl: process.env.PHRONESIS_MODELS_URL || 'https://platform.claude.com/docs/en/about-claude/models/overview',
  });
  if (args.includes('--json')) { process.stdout.write(JSON.stringify(result, null, 2) + '\n'); return; }
  if (result.changes.length) process.stdout.write([
    `Phronesis drift check: ${result.changes.length} change(s) or unverified model listing(s) since ${result.validated}:`,
    ...result.changes.map((c) => `- ${c}`),
    'Tell the user what was observed, distinguish content changes from unknown availability, and offer to re-validate those pieces with phronesis-audit.', '',
  ].join('\n'));
}

// Hook failures must never block Claude sessions. --json exposes coverage to the audit.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    if (process.argv.includes('--json')) process.stdout.write(JSON.stringify({ status: 'unknown', reason: 'drift check could not complete' }) + '\n');
  }).finally(() => { process.exitCode = 0; });
}
