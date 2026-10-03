// Runs `claude -p` in isolation and returns its parsed output. Isolation: only project
// settings load (no user CLAUDE.md, rules, plugins or memory), and no MCP servers, so
// every arm sees the same context apart from what the arm injects.

import { spawn } from 'node:child_process';

const ISOLATION = ['--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence'];

// Every run is pinned to one model, so a change of the user's default model cannot mix
// models inside one comparison. Override with BENCH_MODEL or an explicit --model in args.
export const BENCH_MODEL = process.env.BENCH_MODEL || 'claude-opus-5-5';

export function buildArgs(args) {
  const pinned = args.includes('--model') ? [] : ['--model', BENCH_MODEL];
  return ['-p', ...ISOLATION, ...pinned, ...args];
}

// Spawns claude with `args`, writes `input` to stdin, resolves with stdout text.
// Never rejects: a failed run is returned as { ok: false, error } so one bad run
// cannot stop a benchmark.
export function runClaude({ args, input, cwd, timeoutMs = 600000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', buildArgs(args), { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    // Arrival time of each stdout line, so stream-json tool calls can be timed.
    const lineTimes = [];
    let partial = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d;
      partial += d;
      const parts = partial.split('\n');
      partial = parts.pop();
      for (let i = 0; i < parts.length; i++) lineTimes.push(Date.now() - started);
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: String(error), wallMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout, lineTimes, stderr: stderr.slice(-2000), wallMs: Date.now() - started });
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
export function parseStream(stdout, lineTimes = []) {
  const toolCalls = [];
  const byId = {};
  let result = null;
  stdout.split('\n').forEach((line, i) => {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      return;
    }
    const at = lineTimes[i] ?? null;
    if (d.type === 'assistant') {
      for (const c of d.message?.content || []) {
        if (c.type !== 'tool_use') continue;
        const call = { name: c.name, input: c.input, startMs: at, ms: null };
        toolCalls.push(call);
        byId[c.id] = call;
      }
    }
    // A tool result arrives in the next user message; its arrival ends the call.
    if (d.type === 'user') {
      for (const c of d.message?.content || []) {
        const call = c.type === 'tool_result' && byId[c.tool_use_id];
        if (call && at !== null && call.startMs !== null) call.ms = at - call.startMs;
      }
    }
    if (d.type === 'result') result = d;
  });
  return { toolCalls, result };
}

// The result event of a stream has the same fields as --output-format json.
export function parseStreamResult(stdout) {
  const last = stdout.trim().split('\n').reverse().find((l) => l.includes('"type":"result"'));
  return last ? parseJsonResult(last) : null;
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
