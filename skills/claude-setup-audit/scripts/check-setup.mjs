#!/usr/bin/env node
// Deterministic checks of a repository's Claude Code setup, for the claude-setup-audit skill.
//
//   node check-setup.mjs [repo] [--json] [--usage]
//
// Reads only configuration files and file names. Never opens .env files, keys, PDFs or data
// folders: it reports that they exist, by name. With --usage it also reads this project's
// Claude Code session logs, taking token counts and tool names only, never message text.
// Needs Node 18 or newer and no packages. Exits 0 even when it finds problems.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const repo = path.resolve(argv.find((a) => !a.startsWith('--')) || '.');
const findings = [];
const facts = {};

// severity: high (fix before relying on the setup), medium (should fix), info (worth knowing)
const add = (severity, id, file, message) => findings.push({ severity, id, file: file && path.relative(repo, file), message });

const read = (f) => {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (f) => {
  const t = read(f);
  if (t === null) return null;
  try {
    return JSON.parse(t);
  } catch {
    add('high', 'invalid-json', f, 'File is not valid JSON, so Claude Code ignores it.');
    return null;
  }
};
const listDir = (d) => {
  try {
    return fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return [];
  }
};

// Minimal YAML frontmatter reader: single-line "key: value" pairs, quoted or not.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fields: null, body: text };
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1).replace(/''/g, "'");
    fields[kv[1]] = v;
  }
  return { fields, body: text.slice(m[0].length) };
}

// ------------------------------------------------------------- skills

function checkSkills() {
  const dirs = [path.join(repo, '.claude', 'skills'), path.join(repo, 'skills')];
  const files = [];
  if (fs.existsSync(path.join(repo, 'SKILL.md'))) files.push(path.join(repo, 'SKILL.md'));
  for (const d of dirs) for (const e of listDir(d)) if (e.isDirectory() && fs.existsSync(path.join(d, e.name, 'SKILL.md'))) files.push(path.join(d, e.name, 'SKILL.md'));

  let descChars = 0;
  for (const f of files) {
    const { fields, body } = frontmatter(read(f));
    if (!fields) {
      add('high', 'skill-no-frontmatter', f, 'No YAML frontmatter, so the skill has no name or description to trigger on.');
      continue;
    }
    const { name, description } = fields;
    if (!name) add('medium', 'skill-no-name', f, 'No name; Claude Code falls back to the folder name.');
    else {
      if (name.length > 64) add('high', 'skill-name-long', f, `Name is ${name.length} characters; the limit is 64.`);
      if (!/^[a-z0-9-]+$/.test(name)) add('high', 'skill-name-chars', f, 'Name may contain only lowercase letters, numbers and hyphens.');
      if (/anthropic|claude/.test(name)) add('medium', 'skill-name-reserved', f, `Name "${name}" contains a reserved word ("anthropic" or "claude"). Claude Code accepts it, but the API and claude.ai reject it.`);
    }
    if (!description) add('high', 'skill-no-description', f, 'No description, so the skill cannot trigger on its own.');
    else {
      descChars += description.length;
      if (description.length > 1024) add('high', 'skill-description-long', f, `Description is ${description.length} characters; the limit is 1024.`);
      if (/<[a-zA-Z]/.test(description)) add('high', 'skill-description-xml', f, 'Description contains an XML tag, which is not allowed.');
      if (!/\b(use when|use for|use this when|when the user|when asked)\b/i.test(description) && fields['disable-model-invocation'] !== 'true') {
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

function checkMemoryFiles() {
  for (const f of [path.join(repo, 'CLAUDE.md'), path.join(repo, '.claude', 'CLAUDE.md'), path.join(repo, 'CLAUDE.local.md'), path.join(repo, 'AGENTS.md')]) {
    const text = read(f);
    if (text === null) continue;
    const lines = text.split(/\r?\n/).length;
    facts[path.relative(repo, f)] = `${lines} lines`;
    if (lines > 200) add('medium', 'memory-long', f, `${lines} lines, loaded into every session. Cut what Claude can read from the code; move occasional rules into skills.`);
    for (const m of text.matchAll(/(?:^|\s)@((?:\.{1,2}\/|~\/|\/)?[\w./-]+\.\w+)/g)) {
      const target = m[1].startsWith('~/') ? path.join(os.homedir(), m[1].slice(2)) : path.resolve(path.dirname(f), m[1]);
      if (!fs.existsSync(target)) add('medium', 'memory-broken-import', f, `@${m[1]} does not exist, so nothing is imported.`);
    }
  }
  if (!facts['CLAUDE.md'] && !facts['.claude/CLAUDE.md']) add('info', 'memory-missing', null, 'No CLAUDE.md. Not a problem by itself; add one only for rules Claude cannot read from the code.');
}

// ------------------------------------------------------------- settings and hooks

const BROAD = new Set(['*', 'Bash', 'Bash(*)', 'Bash(:*)', 'Bash(**)', 'Write', 'Write(*)', 'Write(**)', 'Edit', 'Edit(*)', 'Edit(**)', 'WebFetch']);

function checkHooks(hooks, f) {
  for (const [event, groups] of Object.entries(hooks || {})) {
    for (const g of Array.isArray(groups) ? groups : []) {
      if (/^(Pre|Post)ToolUse/.test(event) && (!g.matcher || g.matcher === '*')) {
        add('info', 'hook-every-tool', f, `${event} hook has no matcher, so it runs on every tool call.`);
      }
      for (const h of g.hooks || []) {
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
    for (const rule of s.permissions?.allow || []) {
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
  const models = {};
  for (const e of listDir(d)) {
    if (!e.name.endsWith('.md')) continue;
    const f = path.join(d, e.name);
    const { fields } = frontmatter(read(f));
    if (!fields) continue;
    if (fields.model) models[fields.model] = (models[fields.model] || 0) + 1;
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
  const has = (re) => Object.keys(scripts).some((k) => re.test(k));
  const exists = (...p) => p.some((x) => fs.existsSync(path.join(repo, x)));
  facts.gates = {
    ci: exists('.github/workflows', '.gitlab-ci.yml', '.circleci', 'azure-pipelines.yml', 'Jenkinsfile'),
    tests: has(/^test/) || exists('pytest.ini', 'go.mod', 'Cargo.toml', 'tests', 'test'),
    lint: has(/lint/) || exists('.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs', 'biome.json', 'ruff.toml', '.golangci.yml'),
    typecheck: has(/type-?check|tsc/) || exists('mypy.ini'),
    preCommit: exists('.husky', '.pre-commit-config.yaml', 'lefthook.yml'),
    stopHook: false,
  };
  for (const name of ['settings.json', 'settings.local.json']) {
    const s = readJson(path.join(repo, '.claude', name));
    if (s?.hooks?.Stop) facts.gates.stopHook = true;
  }
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
        if (DATA.has(e.name)) found.push(`${path.relative(repo, p)}/ (data folder)`);
        else walk(p, depth + 1);
      } else if (PRIVATE.test(e.name) && !/\.(example|sample|template)$/i.test(e.name)) {
        found.push(path.relative(repo, p));
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
  const sessions = listDir(dir).filter((e) => e.name.endsWith('.jsonl'));
  const skills = {};
  const perSession = [];
  for (const s of sessions) {
    let input = 0;
    for (const line of (read(path.join(dir, s.name)) || '').split('\n')) {
      let d;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      if (d.type !== 'assistant') continue;
      const u = d.message?.usage;
      if (u) input = Math.max(input, (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0));
      for (const c of d.message?.content || []) if (c?.type === 'tool_use' && c.name === 'Skill') skills[c.input?.skill] = (skills[c.input?.skill] || 0) + 1;
    }
    perSession.push(input);
  }
  facts.usage = {
    sessions: sessions.length,
    peakContextTokensMean: perSession.length ? Math.round(perSession.reduce((a, b) => a + b, 0) / perSession.length) : null,
    skillInvocations: skills,
  };
}

// ------------------------------------------------------------- main

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
