#!/usr/bin/env node
// Deterministic checks of a repository's Claude Code setup, for the phronesis-audit skill.
//
//   node check-setup.mjs [repo] [--json] [--usage]
//
// Reads only configuration files and file names. Never opens .env files, keys, PDFs or data
// folders: it reports that they exist, by name. With --usage it also reads this project's
// Claude Code session logs. It parses metadata and never analyzes or outputs message text.
// Needs Node 18 or newer and no packages. Exits 0 even when it finds problems.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { frontmatter } from './frontmatter.mjs';

const argv = process.argv.slice(2);
const repo = path.resolve(argv.find((a) => !a.startsWith('--')) || '.');
const findings = [];
const facts = { scope: { repositoryOnly: true, ancestorsAndUserSettings: 'not inspected', gateExecution: 'not run' } };
const repoReal = fs.realpathSync(repo);
const relativeFile = (file) => path.relative(repo, file).split(path.sep).join('/');

// severity: high (fix before relying on the setup), medium (should fix), info (worth knowing)
const add = (severity, id, file, message) => findings.push({ severity, id, file: file && relativeFile(file), message });

const read = (f) => {
  try {
    const real = fs.realpathSync(f);
    const rel = path.relative(repoReal, real);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel) || rel.split(path.sep).some((part) => PRIVATE.test(part) || DATA.has(part))) {
      add('info', 'config-skipped', f, 'Outside the repository or private data; content not inspected.');
      return null;
    }
    return fs.readFileSync(real, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (f) => {
  const t = read(f);
  if (t === null) return null;
  try {
    const value = JSON.parse(t);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      add('high', 'invalid-config-shape', f, 'Configuration must be a JSON object; semantic checks skipped.');
      return null;
    }
    return value;
  } catch {
    add('high', 'invalid-json', f, 'File is not valid JSON, so Claude Code ignores it.');
    return null;
  }
};
const listDir = (d) => {
  try {
    const real = fs.realpathSync(d);
    const rel = path.relative(repoReal, real);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return [];
    return fs.readdirSync(real, { withFileTypes: true });
  } catch {
    return [];
  }
};

// ------------------------------------------------------------- skills

function checkSkills() {
  const dirs = [path.join(repo, '.claude', 'skills'), path.join(repo, 'skills')];
  const files = [];
  if (fs.existsSync(path.join(repo, 'SKILL.md'))) files.push(path.join(repo, 'SKILL.md'));
  for (const d of dirs) for (const e of listDir(d)) if (e.isDirectory() && fs.existsSync(path.join(d, e.name, 'SKILL.md'))) files.push(path.join(d, e.name, 'SKILL.md'));

  let descChars = 0;
  for (const f of files) {
    const { fields, body, error } = frontmatter(read(f));
    if (error) {
      add('high', 'invalid-frontmatter', f, 'Frontmatter is unreadable, invalid or unsupported YAML; semantic checks skipped.');
      continue;
    }
    if (!fields) {
      add('high', 'skill-no-frontmatter', f, 'No YAML frontmatter, so the skill has no name or description to trigger on.');
      continue;
    }
    const { name, description } = fields;
    if (!name) add('medium', 'skill-no-name', f, 'No name; Claude Code falls back to the folder name.');
    else if (typeof name !== 'string') add('high', 'skill-name-type', f, 'Name must be a string.');
    else {
      if (name.length > 64) add('high', 'skill-name-long', f, `Name is ${name.length} characters; the limit is 64.`);
      if (!/^[a-z0-9-]+$/.test(name)) add('high', 'skill-name-chars', f, 'Name may contain only lowercase letters, numbers and hyphens.');
      if (/anthropic|claude/.test(name)) add('medium', 'skill-name-reserved', f, `Name "${name}" contains a reserved word ("anthropic" or "claude"). Claude Code accepts it, but the API and claude.ai reject it.`);
    }
    if (!description) add('high', 'skill-no-description', f, 'No description, so the skill cannot trigger on its own.');
    else if (typeof description !== 'string') add('high', 'skill-description-type', f, 'Description must be a string.');
    else {
      descChars += description.length;
      if (description.length > 1024) add('high', 'skill-description-long', f, `Description is ${description.length} characters; the limit is 1024.`);
      if (/<[a-zA-Z]/.test(description)) add('high', 'skill-description-xml', f, 'Description contains an XML tag, which is not allowed.');
      if (!/\b(use when|use for|use this when|when the user|when asked)\b/i.test(description) && fields['disable-model-invocation'] !== true) {
        add('medium', 'skill-no-trigger', f, 'Description does not say when to use the skill ("Use when ..."), so it may not trigger.');
      }
    }
    const lines = body.split(/\r?\n/).length;
    if (lines > 500) add('medium', 'skill-body-long', f, `SKILL.md body is ${lines} lines; keep it under 500 and move detail into referenced files.`);
    const shouts = (body.match(/\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT)\b/g) || []).length;
    if (shouts > 5) add('info', 'skill-shouting', f, `${shouts} capitalised MUST/NEVER/CRITICAL words; current models over-apply emphasis, a stated reason works better.`);
  }
  facts.skills = files.length;
  facts.skillDescriptionChars = descChars;
  if (descChars > 8000) add('medium', 'skill-listing-budget', null, `Skill descriptions total ${descChars} characters. The skill listing gets 1% of the context window (about 8000 characters at 200k tokens); past that, descriptions of the least-used skills are dropped.`);
}

// ------------------------------------------------------------- CLAUDE.md

// Repository instruction discovery is bounded. It does not reconstruct Claude's entire
// effective context (ancestor, user, managed and dynamically loaded instructions).
function repositoryFiles() {
  const files = [];
  let limited = false;
  const walk = (dir, depth) => {
    if (depth > 8 || files.length >= 10000) { limited = true; return; }
    for (const entry of listDir(dir)) {
      if (files.length >= 10000) { limited = true; break; }
      if (entry.isSymbolicLink() || PRIVATE.test(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !DATA.has(entry.name)) walk(file, depth + 1);
      } else if (entry.isFile()) files.push(file);
    }
  };
  walk(repo, 0);
  if (limited) add('info', 'scan-limited', null, 'File discovery hit its depth or count limit; coverage is incomplete.');
  return files;
}

function checkMemoryFiles() {
  const visited = new Set();
  const inspect = (f, chain = []) => {
    const absolute = path.resolve(f);
    if (chain.includes(absolute)) { add('medium', 'memory-import-cycle', f, 'Instruction import cycle detected.'); return; }
    if (visited.has(absolute)) return;
    if (chain.length > 5) { add('info', 'memory-import-depth', f, 'Import depth limit reached; deeper imports not inspected.'); return; }
    visited.add(absolute);
    const text = read(f);
    if (text === null) return;
    const lines = text.split(/\r?\n/).length;
    facts[relativeFile(f)] = `${lines} lines`;
    if (lines > 200) add('medium', 'memory-long', f, `${lines} lines; trim always-loaded rules and move occasional rules into skills. Nested and scoped files load conditionally.`);
    const prose = text.replace(/```[\s\S]*?```|`[^`\n]*`/g, '');
    for (const m of prose.matchAll(/(?:^|\s)@((?:\.{1,2}\/|~\/|\/)?[\w./-]+\.\w+)/g)) {
      const target = m[1].startsWith('~/') ? path.join(os.homedir(), m[1].slice(2)) : path.resolve(path.dirname(f), m[1]);
      const rel = path.relative(repo, target);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        add('info', 'memory-import-outside', f, 'An import points outside this repository; not inspected.');
      } else if (!fs.existsSync(target)) add('medium', 'memory-broken-import', f, `@${m[1]} does not exist, so nothing is imported.`);
      else inspect(target, [...chain, absolute]);
    }
  };
  const memory = discoveredFiles.filter((f) => /^(CLAUDE(?:\.local)?|AGENTS)\.md$/.test(path.basename(f)) || /(?:^|[\/\\])\.claude[\/\\]rules[\/\\].*\.md$/.test(f));
  for (const f of memory) inspect(f);
  facts.instructionFiles = memory.map((f) => relativeFile(f));
  if (!facts['CLAUDE.md'] && !facts['.claude/CLAUDE.md']) add('info', 'memory-missing', null, 'No root CLAUDE.md. Add one only for rules Claude cannot read from the code.');
}

// ------------------------------------------------------------- settings and hooks

const BROAD = new Set(['*', 'Bash', 'Bash(*)', 'Bash(:*)', 'Bash(**)', 'Write', 'Write(*)', 'Write(**)', 'Edit', 'Edit(*)', 'Edit(**)', 'WebFetch']);

function checkHooks(hooks, f) {
  if (hooks && (typeof hooks !== 'object' || Array.isArray(hooks))) {
    add('high', 'invalid-config-shape', f, 'hooks must be an object.');
    return;
  }
  for (const [event, groups] of Object.entries(hooks || {})) {
    if (!Array.isArray(groups)) add('high', 'invalid-config-shape', f, `${event} must contain hook groups in an array.`);
    for (const g of Array.isArray(groups) ? groups : []) {
      if (!g || typeof g !== 'object' || !Array.isArray(g.hooks)) {
        add('high', 'invalid-config-shape', f, `${event} hook group must contain a hooks array.`);
        continue;
      }
      if (/^(Pre|Post)ToolUse/.test(event) && (!g.matcher || g.matcher === '*')) {
        add('info', 'hook-every-tool', f, `${event} hook has no matcher, so it runs on every tool call.`);
      }
      for (const h of g.hooks || []) {
        if (!h || typeof h !== 'object') { add('high', 'invalid-config-shape', f, 'Hook entry must be an object.'); continue; }
        const cmd = String(h.command || '');
        if (/\b(curl|wget)\b[^|]*\|\s*(sh|bash|zsh|node|python)/.test(cmd)) add('high', 'hook-pipe-exec', f, `${event} hook downloads and executes code: ${cmd.slice(0, 80)}`);
        if (/^(\.\/|\.claude\/|[\w-]+\/)[\w./-]+/.test(cmd) && !/CLAUDE_PROJECT_DIR|CLAUDE_PLUGIN_ROOT/.test(cmd)) {
          add('medium', 'hook-relative-path', f, `${event} hook uses a relative path; it breaks when the working directory changes. Use "$CLAUDE_PROJECT_DIR".`);
        }
      }
    }
  }
}

function checkSettings() {
  for (const name of ['settings.json', 'settings.local.json']) {
    const f = path.join(repo, '.claude', name);
    const s = readJson(f);
    if (!s) continue;
    if (s.permissions?.allow !== undefined && !Array.isArray(s.permissions.allow)) add('high', 'invalid-config-shape', f, 'permissions.allow must be an array.');
    for (const rule of Array.isArray(s.permissions?.allow) ? s.permissions.allow : []) {
      if (BROAD.has(rule)) add('high', 'permission-broad', f, `Allow rule "${rule}" pre-approves every use of that tool.`);
    }
    if (s.permissions?.defaultMode === 'bypassPermissions') add('high', 'permission-bypass', f, 'defaultMode is bypassPermissions: no tool call asks first.');
    checkHooks(s.hooks, f);
    facts[`.claude/${name}`] = { allow: (s.permissions?.allow || []).length, hookEvents: Object.keys(s.hooks || {}) };
  }
  const pluginHooks = path.join(repo, 'hooks', 'hooks.json');
  const ph = readJson(pluginHooks);
  if (ph) checkHooks(ph.hooks, pluginHooks);
  const mcp = readJson(path.join(repo, '.mcp.json'));
  if (mcp) facts.mcpServers = Object.keys(mcp.mcpServers || {});
}

// ------------------------------------------------------------- agents

function checkAgents() {
  const d = path.join(repo, '.claude', 'agents');
  const models = Object.create(null);
  for (const e of listDir(d)) {
    if (!e.name.endsWith('.md')) continue;
    const f = path.join(d, e.name);
    const { fields, error } = frontmatter(read(f));
    if (error) add('high', 'invalid-frontmatter', f, 'Invalid or unsupported agent frontmatter; semantic checks skipped.');
    if (!fields) continue;
    if (typeof fields.model === 'string') models[fields.model] = (models[fields.model] || 0) + 1;
    if (!fields.tools) add('info', 'agent-all-tools', f, 'No tools list, so the agent inherits every tool. Give it the narrowest list that works.');
    if (!fields.description) add('high', 'agent-no-description', f, 'No description, so Claude cannot decide when to use the agent.');
  }
  // Model IDs are listed for checking against the models overview page, not judged here.
  facts.agentModels = models;
}

// ------------------------------------------------------------- gates and private files

function checkGates() {
  const pkg = readJson(path.join(repo, 'package.json'));
  const scripts = pkg?.scripts || {};
  const configured = (re) => Object.entries(scripts).filter(([k, v]) => re.test(k) && typeof v === 'string' && v.trim()).map(([k]) => `package.json#scripts.${k}`);
  const existing = (...names) => names.filter((name) => fs.existsSync(path.join(repo, name)));
  const fileNames = discoveredFiles.map((f) => relativeFile(f));
  const evidence = {
    ci: [...fileNames.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)), ...existing('.gitlab-ci.yml', '.circleci/config.yml', 'azure-pipelines.yml', 'Jenkinsfile')],
    tests: [...configured(/^test(?::|$)/), ...fileNames.filter((f) => /(?:^|\/)(?:test_[^/]+\.py|[^/]+_test\.go|[^/]+\.(?:test|spec)\.[cm]?[jt]sx?)$/.test(f))],
    lint: [...configured(/lint/), ...existing('.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs', 'biome.json', 'ruff.toml', '.golangci.yml')],
    typecheck: [...configured(/type-?check|tsc/), ...existing('mypy.ini')],
    preCommit: [...fileNames.filter((f) => /^\.husky\/(?:pre-commit|_\/pre-commit)$/.test(f)), ...existing('.pre-commit-config.yaml', 'lefthook.yml')],
    stopHook: [],
  };
  for (const name of ['settings.json', 'settings.local.json']) {
    const s = readJson(path.join(repo, '.claude', name));
    if (Array.isArray(s?.hooks?.Stop) && s.hooks.Stop.some((g) => Array.isArray(g?.hooks) && g.hooks.length)) evidence.stopHook.push(`.claude/${name}#hooks.Stop`);
  }
  facts.gates = Object.fromEntries(Object.entries(evidence).map(([k, v]) => [k, v.length > 0]));
  facts.gateEvidence = Object.fromEntries(Object.entries(evidence).map(([k, v]) => [k, {
    status: v.length ? 'detected' : 'not detected', evidence: v, execution: 'not run',
  }]));
  // Presence proves neither runnable configuration nor assertion quality. Rust inline
  // tests and custom runners require manual inspection; absent evidence means unknown.
}

const PRIVATE = /^\.env(\..+)?$|\.(pem|key|p12|pfx)$|^id_(rsa|ed25519)|\.pdf$/i;
const SKIP = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', '.venv', 'venv', '__pycache__']);
const DATA = new Set(['local', 'data', 'private', 'secrets']);

function findPrivate() {
  const found = [];
  const walk = (d, depth) => {
    if (depth > 6 || found.length > 50) return;
    for (const e of listDir(d)) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        if (DATA.has(e.name)) found.push(`${relativeFile(p)}/ (data folder)`);
        else walk(p, depth + 1);
      } else if (PRIVATE.test(e.name) && !/\.(example|sample|template)$/i.test(e.name)) {
        found.push(relativeFile(p));
      }
    }
  };
  walk(repo, 0);
  facts.privateNotOpened = found;
}

// ------------------------------------------------------------- usage from session logs

function usage() {
  const slug = repo.replace(/[^A-Za-z0-9]/g, '-');
  const dir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects', slug);
  let sessions = [];
  try { sessions = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.jsonl')); } catch { /* no logs */ }
  const skills = Object.create(null);
  const perSession = [];
  const totals = { input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, output_tokens: 0 };
  let messages = 0;
  for (const s of sessions) {
    const records = new Map();
    const tools = new Set();
    let text;
    try { text = fs.readFileSync(path.join(dir, s.name), 'utf8'); } catch { continue; }
    for (const [lineNumber, line] of text.split('\n').entries()) {
      let d;
      try { d = JSON.parse(line); } catch { continue; }
      if (d.type !== 'assistant') continue;
      const key = d.message?.id || d.uuid || `line-${lineNumber}`;
      const u = d.message?.usage;
      if (u) {
        const previous = records.get(key) || {};
        for (const field of Object.keys(totals)) {
          const value = u[field];
          previous[field] = Math.max(previous[field] || 0, typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);
        }
        records.set(key, previous);
      }
      for (const [index, c] of (Array.isArray(d.message?.content) ? d.message.content : []).entries()) {
        if (c?.type !== 'tool_use' || c.name !== 'Skill' || typeof c.input?.skill !== 'string') continue;
        const id = c.id || `${key}-${index}`;
        if (!tools.has(id)) { tools.add(id); skills[c.input.skill] = (skills[c.input.skill] || 0) + 1; }
      }
    }
    let peak = 0;
    for (const u of records.values()) {
      peak = Math.max(peak, u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens);
      for (const field of Object.keys(totals)) totals[field] += u[field];
      messages++;
    }
    perSession.push(peak);
  }
  facts.usage = {
    sessions: sessions.length,
    peakContextTokensMean: perSession.length ? Math.round(perSession.reduce((a, b) => a + b, 0) / perSession.length) : null,
    assistantMessagesWithUsage: messages, totals, skillInvocations: skills,
    costUsd: null, costStatus: 'not estimated; logged tokens are not a bill',
    coverage: 'top-level project logs only; subagent logs not included',
  };
}

// ------------------------------------------------------------- main

const discoveredFiles = repositoryFiles();
checkSkills();
checkMemoryFiles();
checkSettings();
checkAgents();
checkGates();
findPrivate();
if (argv.includes('--usage')) usage();

const order = { high: 0, medium: 1, info: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

if (argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ repo, findings, facts }, null, 2) + '\n');
} else {
  const count = (s) => findings.filter((f) => f.severity === s).length;
  const out = [`check-setup: ${count('high')} high, ${count('medium')} medium, ${count('info')} info (${repo})`];
  for (const f of findings) out.push(`- [${f.severity}] ${f.id}${f.file ? ` (${f.file})` : ''}: ${f.message}`);
  out.push('', 'Facts:', JSON.stringify(facts, null, 2));
  process.stdout.write(out.join('\n') + '\n');
}
