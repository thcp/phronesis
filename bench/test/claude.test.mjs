import assert from 'node:assert/strict';
import test from 'node:test';
import { parseStream, parseStreamResult } from '../lib/claude.mjs';

const lines = [
  { type: 'system', subtype: 'init' },
  { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npx vitest run' } }] } },
  { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] } },
  { type: 'result', result: 'done', total_cost_usd: 0.5, duration_ms: 9000, num_turns: 2, usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 90, output_tokens: 40 } },
].map((l) => JSON.stringify(l));

test('tool calls are timed from tool_use to tool_result', () => {
  const { toolCalls } = parseStream(lines.join('\n'), [0, 1000, 13500, 14000]);
  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].ms, 12500);
  assert.equal(toolCalls[0].input.command, 'npx vitest run');
});

test('the stream result has the same fields as JSON output', () => {
  const r = parseStreamResult(lines.join('\n'));
  assert.equal(r.text, 'done');
  assert.equal(r.costUsd, 0.5);
  assert.equal(r.cacheWriteTokens, 10);
  assert.equal(r.outputTokens, 40);
});
