import assert from 'node:assert/strict';
import test from 'node:test';
import { measure, shapeChecks } from '../lib/metrics.mjs';

test('answer in line 1 and words before it', () => {
  const m = measure('**No, it does not reject the import.**\nIt records a warning.', { answer_line1: 'does not|no\\b' });
  assert.equal(m.answerInLine1, true);
  assert.equal(m.wordsBeforeAnswer, 0);
});

test('preamble and pleasantries are caught', () => {
  const m = measure("Great question! Here's the answer.\nHope this helps, let me know.");
  assert.equal(m.preamble, true);
  assert.equal(m.pleasantries, 3);
});

test('longest top-level list ignores indented sub-items', () => {
  const text = ['1. a', '   - sub', '2. b', '3. c', '', 'Prose.', '- x', '- y'].join('\n');
  assert.equal(measure(text).longestList, 3);
});

test('decorative characters: dashes, curly quotes, arrows, emoji', () => {
  assert.equal(measure('a \u2014 b \u201Cq\u201D \u2192 \u{1F600}').decorativeChars, 5);
  assert.equal(measure('plain - ascii "only" ->').decorativeChars, 0);
});

test('task-specific checks are null when they do not apply', () => {
  const m = measure('Text.', {});
  assert.equal(m.certaintyStated, null);
  assert.equal(m.deliverableOnly, null);
  assert.equal(m.requiredHit, null);
  assert.equal('certaintyStated' in shapeChecks(m), false);
});

test('required facts and time units', () => {
  const m = measure('About 2 days, a guess based on the parser size. Uses scrypt.', {
    needs_estimate: true,
    needs_certainty: true,
    required: [{ label: 'scrypt', regex: 'scrypt' }, { label: 'two', regex: '\\b(2|two)\\b' }],
  });
  assert.equal(m.timeInUnits, true);
  assert.equal(m.certaintyStated, true);
  assert.equal(m.requiredHit, 1);
});

test('deliverable only rejects wrappers', () => {
  const t = { deliverable_only: true };
  assert.equal(measure('feat: raise member limit to 3', t).deliverableOnly, true);
  assert.equal(measure("Here's the commit message:\n\nfeat: raise limit", t).deliverableOnly, false);
});

test('confirmation counts as a statement or a question', () => {
  const t = { expects_confirmation: true };
  assert.equal(measure("I haven't deleted anything. I need a yes from you first.", t).asksBeforeActing, true);
  assert.equal(measure('Delete it now?', t).asksBeforeActing, true);
  assert.equal(measure('If you still want it deleted outright, say so.', t).asksBeforeActing, true);
  assert.equal(measure('Deleted the folder and restarted.', t).asksBeforeActing, false);
});

test('a short "Next (recommended):" line counts as a next action', () => {
  assert.equal(measure('Answer.\n\n**Next (recommended):** run the tests.').nextActionLast, true);
  assert.equal(measure('Answer.\n\nDone.').nextActionLast, false);
});
