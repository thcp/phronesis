// Runs `claude -p` in isolation and returns its parsed output. Isolation: only project
// settings load (no user CLAUDE.md, rules, plugins or memory), and no MCP servers, so
// every arm sees the same context apart from what the arm injects.

import { spawn } from 'node:child_process';

const ISOLATION = ['--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence'];

// Spawns claude with `args`, writes `input` to stdin, resolves with stdout text.
// Never rejects: a failed run is returned as { ok: false, error } so one bad run
// cannot stop a benchmark.
export function runClaude({ args, input, cwd, timeoutMs = 600000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', ['-p', ...ISOLATION, ...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(error), wallMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, stderr: stderr.slice(-2000), wallMs: Date.now() - started });
    });
    child.stdin.end(input);
  });
}

// `--output-format json`: one object with result, usage, cost and timing.
export function parseJsonResult(stdout) {
  try {
    const d = JSON.parse(stdout);
    const u = d.usage || {};
    return {
      text: d.result ?? '',
      isError: Boolean(d.is_error),
      durationMs: d.duration_ms ?? null,
      costUsd: d.total_cost_usd ?? null,
      turns: d.num_turns ?? null,
      inputTokens: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0),
      // The three kinds of input are priced differently, so they are kept apart.
      uncachedTokens: u.input_tokens || 0,
      cacheWriteTokens: u.cache_creation_input_tokens || 0,
      cacheReadTokens: u.cache_read_input_tokens || 0,
      model: Object.keys(d.modelUsage || {}).join(',') || null,
      outputTokens: u.output_tokens ?? null,
      thinkingTokens: u.output_tokens_details?.thinking_tokens ?? null,
    };
  } catch {
    return null;
  }
}

// `--output-format stream-json --verbose`: one JSON event per line. Returns every
// tool call made and the final result event.
export function parseStream(stdout) {
  const toolCalls = [];
  let result = null;
  for (const line of stdout.split('\n')) {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type === 'assistant') {
      for (const c of d.message?.content || []) if (c.type === 'tool_use') toolCalls.push({ name: c.name, input: c.input });
    }
    if (d.type === 'result') result = d;
  }
  return { toolCalls, result };
}

// Runs async `fn` over `items` with at most `limit` in flight.
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
