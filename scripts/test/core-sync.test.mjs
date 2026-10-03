import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// core.md is the short copy of the rules in SKILL.md. This test fails when the rule numbers
// differ or a rule loses a key phrase in either file, so an edit to one forces the other.

// Windows checkouts may use CRLF; normalize so the section markers match.
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const skill = read('skills/phronesis/SKILL.md');
const core = read('skills/phronesis/core.md');

// Rule bodies keyed by number. A rule starts at "N. " at the start of a line and runs until
// the next rule or the first blank line, so wrapped lines are part of it.
function rulesOf(text) {
  const out = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\. (.*)$/);
    if (m) {
      current = Number(m[1]);
      assert.ok(!out.has(current), `rule ${current} appears twice`);
      out.set(current, m[2]);
    } else if (current !== null && line.trim() !== '') {
      out.set(current, `${out.get(current)} ${line.trim()}`);
    } else {
      current = null;
    }
  }
  for (const [n, body] of out) out.set(n, body.replace(/\s+/g, ' ').toLowerCase());
  return out;
}

const section = (text, start, end) => {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `missing "${start}"`);
  const to = end ? text.indexOf(end, from) : text.length;
  assert.ok(to > from, `missing "${end}" after "${start}"`);
  return text.slice(from, to);
};

const skillRules = rulesOf(section(skill, '\n## Rules\n', '\n## When to break the shape'));
const coreRules = rulesOf(section(core, '\n1. ', '\nBreak the shape when'));

// Phrases each rule must carry in both files. Matched lower case, whitespace collapsed.
const KEY = {
  1: ['first line', 'answer or the next action'],
  2: ['numbered list', 'one action'],
  3: ['where things stand', 'goal', 'must not'],
  4: ['real units', 'guess as a guess', 'proposed or asked about'],
  5: ['idioms, metaphors, sarcasm or rhetorical questions'],
  6: ['the same word for the same thing'],
  7: ['**next (recommended):** x.', 'about five lines', 'fragments', 'closing offer', 'about 12 lines'],
  8: ['before acting', 'reason'],
  9: ['reason with every rule or recommendation'],
  10: ['file:line', 'not verified', "i don't know"],
  11: ['update every test', 'type check', 'quietest output', 'test cases'],
  12: ['five visible items', 'rank'],
  13: ['one topic per reply', 'one question at the end'],
  14: ['preamble', 'pleasantries', 'exclamation marks', 'emoji'],
  15: ['predictable', 'rename', 'exists'],
  16: ['numbers', 'units', 'scope words', '"only"', '"every"'],
  17: ['callers', 'routes', 'ui', 'tests', 'translations'],
};

test('core.md and SKILL.md number the same rules, 1 to N without gaps', () => {
  const nums = [...skillRules.keys()];
  assert.deepEqual(nums, nums.map((_, i) => i + 1), 'SKILL.md rules are not numbered 1..N in order');
  assert.deepEqual([...coreRules.keys()], nums, 'core.md rule numbers differ from SKILL.md');
});

test('every rule has a key phrase list', () => {
  assert.deepEqual(Object.keys(KEY).map(Number), [...skillRules.keys()]);
});

test('each rule carries its key phrases in both files', () => {
  const missing = [];
  for (const [n, phrases] of Object.entries(KEY)) {
    for (const p of phrases) {
      if (!skillRules.get(Number(n))?.includes(p)) missing.push(`SKILL.md rule ${n}: ${p}`);
      if (!coreRules.get(Number(n))?.includes(p)) missing.push(`core.md rule ${n}: ${p}`);
    }
  }
  assert.deepEqual(missing, []);
});

// A native style must preserve Claude's engineering prompt and never force itself on.
test('native output style stays synchronized with the hook core', async () => {
  const { outputStyle } = await import('../sync-output-style.mjs');
  assert.equal(read('output-styles/phronesis.md'), outputStyle(read('skills/phronesis/core.md')));
  const { frontmatter } = await import('../../skills/phronesis-audit/scripts/frontmatter.mjs');
  const { fields, error } = frontmatter(read('output-styles/phronesis.md'));
  assert.equal(error, null);
  assert.equal(fields['keep-coding-instructions'], true);
  assert.equal(fields['force-for-plugin'], false);
});
