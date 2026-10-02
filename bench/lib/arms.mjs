// An arm is one version of Phronesis under test:
//   name=none          no Phronesis (the control)
//   name=git:<ref>     the plugin as it was at a git ref of this repository
//   name=dir:<path>    the plugin in a directory (for example "." for the working tree)
//
// For reply tests an arm injects exactly what its own hooks would inject with
// always-on enabled, by running the hooks from that version's hooks/hooks.json.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

export function parseArm(spec, workDir) {
  const eq = spec.indexOf('=');
  if (eq < 1) throw new Error(`Arm "${spec}" must look like name=none, name=git:<ref> or name=dir:<path>`);
  const name = spec.slice(0, eq);
  const source = spec.slice(eq + 1);
  if (source === 'none') return { name, source, dir: null };
  if (source.startsWith('dir:')) return { name, source, dir: path.resolve(source.slice(4)) };
  if (source.startsWith('git:')) {
    const ref = source.slice(4);
    const sha = execFileSync('git', ['-C', REPO, 'rev-parse', '--short', ref], { encoding: 'utf8' }).trim();
    const dir = path.join(workDir, 'refs', sha);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      // git archive copies tracked files only, without touching the repository's worktrees.
      const tar = spawnSync('sh', ['-c', `git -C "${REPO}" archive "${sha}" | tar -x -C "${dir}"`]);
      if (tar.status !== 0) throw new Error(`Could not extract ${ref}: ${tar.stderr}`);
    }
    return { name, source: `${source} (${sha})`, dir };
  }
  throw new Error(`Unknown arm source "${source}"`);
}

// Hook output is plain text or JSON with hookSpecificOutput.additionalContext
// (https://code.claude.com/docs/en/hooks). Both are added to Claude's context.
function contextFrom(stdout) {
  const text = stdout.trim();
  if (!text.startsWith('{')) return text;
  try {
    return JSON.parse(text).hookSpecificOutput?.additionalContext ?? '';
  } catch {
    return text;
  }
}

function matches(matcher, value) {
  if (!matcher || matcher === '*') return true;
  return new RegExp(`^(?:${matcher})$`).test(value);
}

// The arm's own subagents (agents/*.md), as the JSON that `claude --agents` takes, written
// to a file. Returns null when the arm ships none. Installed plugins make their agents
// available, so the benchmark does too.
export function agentsFile(arm, workDir) {
  if (!arm.dir) return null;
  const dir = path.join(arm.dir, 'agents');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  const agents = {};
  for (const f of files) {
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) continue;
    const fm = Object.fromEntries(m[1].split(/\r?\n/).map((l) => l.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
    if (!fm.name || !fm.description) continue;
    agents[fm.name] = {
      description: fm.description,
      prompt: m[2].trim(),
      ...(fm.tools ? { tools: fm.tools.split(',').map((t) => t.trim()) } : {}),
      ...(fm.model ? { model: fm.model } : {}),
      ...(fm.effort ? { effort: fm.effort } : {}),
    };
  }
  if (!Object.keys(agents).length) return null;
  const out = path.join(workDir, 'agents', `${arm.name}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(agents));
  return out;
}

// A plugin declares hooks in hooks/hooks.json, or in .claude-plugin/plugin.json as an
// inline object or as a path to a hooks file. All three are merged, as Claude Code does.
function pluginHooks(dir) {
  const read = (f) => {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      return null;
    }
  };
  const sources = [read(path.join(dir, 'hooks', 'hooks.json'))?.hooks];
  const manifest = read(path.join(dir, '.claude-plugin', 'plugin.json'));
  if (typeof manifest?.hooks === 'string') {
    const f = path.resolve(dir, manifest.hooks);
    if (f !== path.join(dir, 'hooks', 'hooks.json')) sources.push(read(f)?.hooks);
  } else if (manifest?.hooks) sources.push(manifest.hooks.hooks || manifest.hooks);
  const merged = {};
  for (const h of sources.filter(Boolean)) for (const [event, groups] of Object.entries(h)) (merged[event] ||= []).push(...groups);
  return merged;
}

// Runs every hook of `event` in the arm's hooks.json, as Claude Code would with
// always-on turned on, and returns the context they add.
export function hookContext(arm, event, input) {
  if (!arm.dir) return '';
  const groups = pluginHooks(arm.dir)[event] || [];
  if (!groups.length) return '';

  // Fixed paths, not fresh temporary ones: hook output can name these paths (always-on
  // names its flag file), and text that changes on every run defeats the prompt cache,
  // which no real session does. The project folder is not a git repository, so the
  // first-run offer stays silent.
  const config = path.join(os.tmpdir(), 'phronesis-bench-config');
  const project = path.join(os.tmpdir(), 'phronesis-bench-project');
  fs.mkdirSync(config, { recursive: true });
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(config, '.phronesis-always'), '');

  const parts = [];
  for (const group of groups) {
    if (event === 'SessionStart' && !matches(group.matcher, 'startup')) continue;
    for (const hook of group.hooks || []) {
      if (hook.type !== 'command') continue;
      const res = spawnSync(hook.command, {
        shell: true,
        input: JSON.stringify({ hook_event_name: event, session_id: 'bench', cwd: project, source: 'startup', ...input }),
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: arm.dir, CLAUDE_CONFIG_DIR: config, CLAUDE_PROJECT_DIR: project },
        encoding: 'utf8',
        timeout: (hook.timeout || 30) * 1000,
      });
      const ctx = contextFrom(res.stdout || '');
      if (ctx) parts.push(ctx);
    }
  }
  return parts.join('\n\n');
}
