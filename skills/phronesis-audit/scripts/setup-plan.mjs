#!/usr/bin/env node
// Preview by default. --apply explicitly writes a reviewed setup plan; --verify also
// executes its reviewed commands. --rollback ID restores files without losing later edits.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const statePath = '.claude/phronesis-state';

function resolveSafe(root, relative, internal = false) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.includes('\0') || path.isAbsolute(relative)) throw new Error('Expected a relative repository path');
  const parts = relative.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || p === '.git' || /^\.env(?:\.|$)|\.(pem|key|p12|pfx)$|^id_(rsa|ed25519)/i.test(p))) throw new Error('Unsafe setup path');
  if (!internal && relative.startsWith(statePath)) throw new Error('Setup state is reserved');
  if (!internal && relative !== 'CLAUDE.md' && relative !== 'CLAUDE.local.md' && !relative.startsWith('.claude/')) throw new Error('Only Claude repository configuration can be changed');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) throw new Error('Symlinks are not allowed in setup paths');
    if (current !== path.join(root, ...parts) && stat && !stat.isDirectory()) throw new Error('Setup parent is not a directory');
  }
  return current;
}

function currentFile(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('Setup target is not a regular file');
    const content = fs.readFileSync(file, 'utf8');
    return { content, hash: sha256(content), mode: stat.mode & 0o777 };
  } catch (error) {
    if (error.code === 'ENOENT') return { content: null, hash: null, mode: 0o600 };
    throw error;
  }
}

function writeAtomic(file, content, mode = 0o600) {
  if (content === null) { if (fs.existsSync(file)) fs.unlinkSync(file); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.phronesis-${crypto.randomUUID()}.tmp`;
  const descriptor = fs.openSync(temp, 'wx', mode);
  try { fs.writeFileSync(descriptor, content); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  try { fs.renameSync(temp, file); } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

export function previewPlan(root, plan) {
  root = fs.realpathSync(root);
  if (plan?.version !== 1 || !Array.isArray(plan.files) || !Array.isArray(plan.checks || [])) throw new Error('Invalid setup plan version or structure');
  const seen = new Set();
  const records = plan.files.map((item) => {
    const file = resolveSafe(root, item.path);
    if ([...seen].some((p) => p === item.path || p.startsWith(`${item.path}/`) || item.path.startsWith(`${p}/`))) throw new Error(`Overlapping setup paths: ${item.path}`);
    seen.add(item.path);
    if (!Object.hasOwn(item, 'beforeSha256') || !(item.beforeSha256 === null || /^[a-f0-9]{64}$/.test(item.beforeSha256))) throw new Error('Every file needs beforeSha256 (null for a new file)');
    if (!(item.content === null || typeof item.content === 'string')) throw new Error('File content must be a string, or null for deletion');
    const before = currentFile(file);
    const afterHash = item.content === null ? null : sha256(item.content);
    const changed = before.hash !== afterHash;
    if (changed && before.hash !== item.beforeSha256) throw new Error(`Conflict: ${item.path}; regenerate the plan from current content`);
    return { path: item.path, before, content: item.content, afterHash, changed };
  });
  for (const command of plan.checks || []) {
    if (!Array.isArray(command.argv) || !command.argv.length || command.argv.some((arg) => typeof arg !== 'string' || !arg || arg.includes('\0'))) throw new Error('Checks need a nonempty argv array');
    if (command.timeoutMs !== undefined && (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1 || command.timeoutMs > 300000)) throw new Error('Invalid check timeout');
  }
  return records;
}

function withLock(root, run) {
  const dir = resolveSafe(root, `${statePath}/transactions`, true);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const lock = resolveSafe(root, `${statePath}/apply.lock`, true);
  const fd = fs.openSync(lock, 'wx', 0o600);
  try { return run(dir); } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
}

function restore(root, journal, file) {
  // Preflight ALL files before restoring any. Pending journals also recover a process
  // interrupted between a file write and the journal status update.
  const records = journal.files.filter((record) => record.changed);
  for (const record of records) {
    if (!(record.before?.content === null || typeof record.before?.content === 'string') || !(record.content === null || typeof record.content === 'string') ||
        record.before.hash !== (record.before.content === null ? null : sha256(record.before.content)) ||
        record.afterHash !== (record.content === null ? null : sha256(record.content)) ||
        !Number.isInteger(record.before.mode) || record.before.mode < 0 || record.before.mode > 0o777) throw new Error('Invalid transaction file record');
    const now = currentFile(resolveSafe(root, record.path));
    if (now.hash !== record.afterHash && now.hash !== record.before.hash) throw new Error(`Rollback conflict: ${record.path}; later edits preserved`);
  }
  for (const record of records) {
    const target = resolveSafe(root, record.path);
    if (currentFile(target).hash !== record.before.hash) writeAtomic(target, record.before.content, record.before.mode);
  }
  journal.status = 'rolled-back';
  writeAtomic(file, JSON.stringify(journal, null, 2));
}

export function applyPlan(root, plan, { verify = false } = {}) {
  root = fs.realpathSync(root);
  return withLock(root, (dir) => {
    const records = previewPlan(root, plan);
    if (!records.some((r) => r.changed) && !verify) return { status: 'unchanged', transaction: null, verification: 'not run' };
    const id = crypto.randomUUID();
    const file = path.join(dir, `${id}.json`);
    const journal = { version: 1, id, status: 'pending', files: records, checks: plan.checks || [], verification: [] };
    writeAtomic(file, JSON.stringify(journal, null, 2));
    try {
      for (const record of records.filter((r) => r.changed)) {
        const target = resolveSafe(root, record.path);
        if (currentFile(target).hash !== record.before.hash) throw new Error(`Conflict: ${record.path}`);
        writeAtomic(target, record.content, record.before.mode);
      }
      if (verify) for (const command of journal.checks) {
        const result = spawnSync(command.argv[0], command.argv.slice(1), { cwd: root, shell: false, encoding: 'utf8', timeout: command.timeoutMs || 30000, maxBuffer: 1024 * 1024 });
        // No command output stored: it can contain private project information.
        journal.verification.push({ argv: command.argv, exitCode: result.status, passed: !result.error && result.status === 0 });
        if (result.error || result.status !== 0) throw new Error('A setup verification command failed');
      }
      journal.status = 'applied';
      writeAtomic(file, JSON.stringify(journal, null, 2));
      return { status: journal.status, transaction: id, verification: verify ? journal.verification : 'not run' };
    } catch (error) {
      try { restore(root, journal, file); } catch (rollbackError) { throw new Error(`${error.message}; ${rollbackError.message}; recover transaction ${id}`); }
      throw new Error(`${error.message}; setup files rolled back (transaction ${id})`);
    }
  });
}

export function rollbackPlan(root, id) {
  root = fs.realpathSync(root);
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid transaction ID');
  return withLock(root, () => {
    const file = resolveSafe(root, `${statePath}/transactions/${id}.json`, true);
    const journal = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (journal.version !== 1 || journal.id !== id || !Array.isArray(journal.files)) throw new Error('Invalid transaction journal');
    restore(root, journal, file);
    return { status: 'rolled-back', transaction: id };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [root = '.', input, ...args] = process.argv.slice(2);
    if (!input || args.some((a) => !['--apply', '--verify', '--rollback'].includes(a)) || (args.includes('--verify') && !args.includes('--apply'))) throw new Error('usage: setup-plan.mjs REPO PLAN.json [--apply [--verify]] | REPO ID --rollback');
    let result;
    if (args.includes('--rollback')) result = rollbackPlan(root, input);
    else {
      const plan = JSON.parse(fs.readFileSync(input, 'utf8'));
      result = args.includes('--apply') ? applyPlan(root, plan, { verify: args.includes('--verify') }) : {
        status: 'preview', files: previewPlan(root, plan).map(({ path, changed, before, afterHash }) => ({ path, changed, beforeSha256: before.hash, afterSha256: afterHash })),
        checks: plan.checks || [], verification: 'not run',
      };
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
