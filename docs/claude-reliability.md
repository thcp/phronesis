# Claude-first reliability work

This branch improves the Claude Code plugin and its bundled audit tools. It does not
establish a numeric quality rating or superiority over other plugins.

## What is covered

- Full YAML frontmatter parsing, including folded and literal descriptions, quoted values,
  booleans and arrays. Invalid/unsupported mappings are reported without source snippets.
  The bundled ISC-licensed parser needs no runtime package installation.
- Gate evidence is separated from execution. Manifests and empty directories do not prove
  tests exist. A detected script or test filename does not prove meaningful assertions.
- Repository nested instruction files, scoped rules and bounded imports are discovered.
  Cycles, external imports and discovery limits are explicit. User, managed and ancestor
  configuration is not inspected, so this is not Claude's complete effective context.
- Custom deny-list reports and placeholders use opaque labels rather than copying the
  matched deny value or regex. Pattern matching still cannot prove that arbitrary private information is absent.
- Reply checks require a next action only when requested by task metadata. Required and
  forbidden regex contracts can be checked; this is not semantic correctness grading.
- Usage consolidates duplicate message IDs and tool calls, separates input/cache/output
  totals and labels top-level log coverage. It does not estimate a bill.
- Drift compares adopted path content at the validated commit and current default branch.
  Successful observations are cached; failures are retried. Changed lock inputs invalidate
  the cache. Missing model listings do not establish retirement. Hash version 2 prefers
  main/article text; old hashes retain their existing behavior until revalidated.
- [Setup plans](../skills/phronesis-audit/references/setup-plan.md) support preview, expected
  hashes, explicit verification and rollback that preserves subsequent edits.
- The optional native style preserves Claude's coding instructions and is generated from
  the hook core. User preferences override defaults; no diagnosis is assumed.

## Reproduce deterministic validation

```sh
node scripts/check.mjs
node --test "hooks/test/*.test.mjs" "skills/phronesis-audit/scripts/test/*.test.mjs" "bench/test/*.test.mjs" "scripts/test/*.test.mjs"
claude plugin validate .claude-plugin/plugin.json
```

CI runs repository checks and deterministic tests with Node 22 on Linux, macOS and Windows.
Claude Code 2.1.288 accepts the plugin manifest and emits a warning that the repository
root `CLAUDE.md` is not loaded for plugin consumers. That file contains contributor
instructions, not shipped user context; the skill and native style carry user rules.
Strict validation promotes that existing warning to a failure. YAML and style parity
are covered by the repository checks, not inferred from manifest validation.

Local passing checks establish behavior for synthetic fixtures, not cross-platform live
Claude integration. Symlink creation tests require privileges on Windows.

## Public behavior cases

Five new `reliability` cases cover lookup without filler, exact JSON, number/unit/scope
preservation, a complete list overriding the five-item default, and resuming from corrected
progress notes. The last is a context-recovery prompt, not a measured multi-turn session.
All inputs are made up. The deterministic graders check the stated contracts; they are
not a human comprehension study or a broad code-quality benchmark.

```sh
claude plugin eval . --tag reliability --runs 3 --model claude-opus-5-5 --no-publish --trust-plugin
```

Use `--trust-plugin` only on the reviewed checkout. The cases require no shell grants or
scaffolding. Runs use your account's model usage; reports stay in ignored `evals/results/`.
Keep both arms and the same explicit model. Skill-fired checks are indicators, excluded
from comparison scores. Freeze cases before measuring; record all failures and costs,
including zero or negative deltas. Use fresh tasks before claiming generalization.

On 2026-10-03, the local eval attempt stopped at authentication: its isolated Claude
session reported "Not logged in". No valid behavioral comparison was produced. Its
partial score is an infrastructure failure and is not published as plugin performance.
Historical v0.5.0 results remain historical; changed metric applicability must not be
silently compared with those old scores.

Eval format and isolation reference, read 2026-10-03:
https://code.claude.com/docs/en/plugin-evals.
Native style semantics, read 2026-10-03:
https://code.claude.com/docs/en/output-styles.

## Evidence still needed

1. Run the public comparison after authentication, then held-out coding tasks against both
   default Claude and a simple concise-output baseline. Include acceptance tests, regressions,
   unnecessary edits, latency, logged tokens and skill triggers. Pin model and Claude version.
2. Test an actual interrupted/resumed session and a compacted session, including preference
   changes, cancelled work and newer constraints. Verify the native style and hook mode
   separately. Do not claim durability merely because instructions say they persist.
3. Validate approved setup plans in fresh sessions on all supported operating systems.
   Confirm skills load, hooks fire and checks can fail meaningfully. No-op reapply and
   conflict-preserving rollback are deterministic prerequisites, not complete integration.
4. Conduct an opt-in human-reader study: compare default Claude, a simple concise prompt and
   Phronesis in randomized, counterbalanced order. Let participants choose detail level;
   measure correct task understanding, time to find the next action, corrections after
   interruptions and perceived effort. Treat ADHD/autism group evidence as background,
   not a prediction about individuals. Report aggregate results only, with uncertainty.
5. Publish a versioned scorecard with predetermined success criteria and known failures.
   A perfect format score alone is insufficient: correct code, useful decisions and user
   control must hold at an acceptable time/token cost. Do not market this work as "10/10"
   while the live and human outcomes remain unmeasured.
