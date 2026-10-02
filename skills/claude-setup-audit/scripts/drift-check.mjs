#!/usr/bin/env node
// Session-start drift check for a setup made by the claude-setup-audit skill.
//
//   node drift-check.mjs            compare .claude/phronesis-lock.json with upstream
//   node drift-check.mjs --hash URL print the content hash of a documentation page
//
// Compares the lock file with upstream: new commits on each adopted source, changed
// content on each documentation page, and model IDs the models overview no longer
// lists. Runs the network part at most once a day (cache in
// .claude/.phronesis-drift-cache.json), gives each request 4 seconds, and treats being
// offline as "not checked". Prints nothing when nothing changed. Never fails the session:
// it always exits 0. Node 18 or newer, no packages, any operating system.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const GITHUB = process.env.PHRONESIS_GITHUB_API || 'https://api.github.com';
const MODELS = process.env.PHRONESIS_MODELS_URL || 'https://platform.claude.com/docs/en/about-claude/models/overview';
const TIMEOUT_MS = 4000;

async function get(url, json = false) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'phronesis-drift-check', Accept: json ? 'application/vnd.github+json' : 'text/html' },
    });
    if (!res.ok) return null;
    return json ? await res.json() : await res.text();
  } catch {
    return null;
  }
}

// Hash of a page's visible text, so markup and script changes do not count as changes.
function contentHash(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function check(lock) {
  const changes = [];
  let reached = 0;

  const sources = (lock.sources || []).map(async (s) => {
    const q = s.path ? `?path=${encodeURIComponent(s.path)}&per_page=1` : '?per_page=1';
    const data = await get(`${GITHUB}/repos/${s.repo}/commits${q}`, true);
    if (!Array.isArray(data) || !data[0]?.sha) return;
    reached++;
    const now = data[0].sha;
    if (s.commit && !now.startsWith(s.commit) && !s.commit.startsWith(now)) {
      changes.push(`source ${s.repo}${s.path ? `/${s.path}` : ''}: new commits (validated ${s.commit.slice(0, 7)}, now ${now.slice(0, 7)})`);
    }
  });

  const docs = (lock.docs || []).map(async (d) => {
    const html = await get(d.url);
    if (html === null) return;
    reached++;
    if (d.sha256 && contentHash(html) !== d.sha256) changes.push(`doc ${d.url}: content changed since ${d.date || 'validation'}`);
  });

  const models = (async () => {
    if (!(lock.models || []).length) return;
    const html = await get(MODELS);
    if (html === null) return;
    reached++;
    for (const id of lock.models) if (!html.includes(id)) changes.push(`model ${id}: no longer listed on the models overview`);
  })();

  await Promise.all([...sources, ...docs, models]);
  return { changes, reached };
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--hash') {
    const html = await get(args[1]);
    process.stdout.write(html === null ? `not reachable: ${args[1]}\n` : `${contentHash(html)}\n`);
    return;
  }

  const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const lockFile = path.join(project, '.claude', 'phronesis-lock.json');
  if (!fs.existsSync(lockFile)) return;
  const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  const cacheFile = path.join(project, '.claude', '.phronesis-drift-cache.json');
  const today = new Date().toISOString().slice(0, 10);

  let changes;
  let cache = null;
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {}
  if (cache?.checked === today) {
    changes = cache.changes || [];
  } else {
    const result = await check(lock);
    // Offline or every request failed: "not checked", so no cache and no message.
    if (result.reached === 0) return;
    changes = result.changes;
    fs.writeFileSync(cacheFile, JSON.stringify({ checked: today, changes }, null, 2));
  }

  if (!changes.length) return;
  process.stdout.write(
    [
      `Phronesis drift check: ${changes.length} change(s) since the setup was validated on ${lock.validated || 'an unknown date'}:`,
      ...changes.map((c) => `- ${c}`),
      'In your first message, tell the user what changed and what it could affect in this setup, and offer to re-validate those pieces with the claude-setup-audit skill.',
      '',
    ].join('\n'),
  );
}

// Exit code 0 always; process.exit() is avoided because it can cut off piped output.
main()
  .catch(() => {})
  .finally(() => {
    process.exitCode = 0;
  });
