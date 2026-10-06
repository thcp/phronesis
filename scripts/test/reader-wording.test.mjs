import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// The reader is named as autistic (level 1) with ADHD on purpose: the model reads these lines
// as who it writes for. Rewording them changes behaviour, so it needs a decision and a
// benchmark run, not a drive-by edit. This test fails when one of them is removed.

const norm = (s) => s.replace(/\s+/g, ' ').toLowerCase();

const REQUIRED = {
  'skills/phronesis/SKILL.md': [
    'built on research on adhd and autistic (level 1) readers',
    'the reader is autistic (level 1) and has adhd',
    'adhd needs less text; autism needs nothing left implicit',
  ],
  'skills/phronesis/core.md': ['the reader is autistic (level 1) and has adhd'],
  'output-styles/phronesis.md': ['the reader is autistic (level 1) and has adhd', 'a reader who is autistic (level 1) and has adhd'],
  'GEMINI.md': ['a reader who is autistic (level 1) and has adhd'],
  '.codex-plugin/plugin.json': ['a reader who is autistic (level 1) and has adhd'],
};

test('the reader stays named as autistic (level 1) with ADHD', () => {
  const missing = [];
  for (const [file, phrases] of Object.entries(REQUIRED)) {
    const text = norm(fs.readFileSync(file, 'utf8'));
    for (const p of phrases) if (!text.includes(p)) missing.push(`${file}: ${p}`);
  }
  assert.deepEqual(missing, []);
});
