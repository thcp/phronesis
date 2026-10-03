// Grade authoring regressions: each contract accepts a valid reply and rejects a
// specific failure. This checks the graders, not Claude's behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { frontmatter } from '../../skills/phronesis-audit/scripts/frontmatter.mjs';

const fixtures = {
  'lookup-no-filler/answer': ['Port 8443.', 'Port 9000.'],
  'lookup-no-filler/no-invented-work': ['Port 8443.', 'Port 8443. Next action: read the config.'],
  'exact-json/exact-deliverable': ['{"enabled":true,"retryLimit":3}', '```json\n{"enabled":true,"retryLimit":3}\n```'],
  'precision-scope/scope-staging': ['Only staging workers retry.', 'All workers retry.'],
  'precision-scope/threshold': ['at least 0.25 ms', 'about 0.3 ms'],
  'precision-scope/interval': ['every 17 seconds', 'every few seconds'],
  'precision-scope/production': ['Production workers never retry.', 'Production workers retry.'],
  'explicit-full-list/complete-list': ['1. alpha.ts\n2. bravo.ts\n3. charlie.ts\n4. delta.ts\n5. echo.ts\n6. foxtrot.ts\n7. golf.ts', '1. alpha.ts\n2. bravo.ts\n3. charlie.ts\n4. delta.ts\n5. echo.ts'],
  'continuity-correction/parser-done': ['Parser done.', 'Parser not implemented.'],
  'continuity-correction/tests-not-run': ['Tests have not been run.', 'Tests passed.'],
  'continuity-correction/constraints': ['Do not rename the public API; do not deploy.', 'Rename the API and deploy.'],
  'continuity-correction/no-false-verification': ['Tests have not been run.', 'All tests passed.'],
};

test('every new reliability regex grader has positive and negative fixtures', () => {
  const cases = ['lookup-no-filler', 'exact-json', 'precision-scope', 'explicit-full-list', 'continuity-correction'];
  const actual = cases.flatMap((c) => fs.readdirSync(`evals/${c}/graders`).filter((f) => f !== 'skill-fired.md').map((f) => `${c}/${path.basename(f, '.md')}`));
  assert.deepEqual(actual.sort(), Object.keys(fixtures).sort());
});

for (const [contract, [good, bad]] of Object.entries(fixtures)) test(`grader contract: ${contract}`, () => {
  const [name, grader] = contract.split('/');
  const { fields, error } = frontmatter(fs.readFileSync(`evals/${name}/graders/${grader}.md`, 'utf8'));
  assert.equal(error, null);
  const accepts = (reply) => {
    const hit = new RegExp(fields.pattern, fields.flags || '').test(reply);
    return fields.match === 'not_contains' ? !hit : hit;
  };
  assert.equal(accepts(good), true);
  assert.equal(accepts(bad), false);
});
