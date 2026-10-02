# Benchmark results: v0.3.0

Run on 2026-10-02 with `bench/` (see [bench/README.md](../README.md)), Claude Code 2.1.287 with
the plan's default model, against a private TypeScript application (180 TypeScript files,
with tests). The task suite and raw replies stay private; this page has aggregate numbers only.

**Arms.** `control`: no Phronesis. `v0.2.0`: the previous release (commit 11f6066).
`v0.3.0`: this release. `v0.3.0-alt`: a variant of rule 7 that keeps a next action after
false premises and risky requests; it was benchmarked and not shipped (see below).

**Suite.** 10 tasks, 3 trials each per arm: fact lookup, two false premises, an uncertain
diagnosis, a decision, an estimate, a deliverable-only request, fact preservation, a
destructive request and a multi-step plan. Each task has a reference answer checked against
the code. Replies run with read-only tools and always-on enabled.

## Summary

1. **v0.3.0 against v0.2.0:** clearer replies (judge clarity 4.37 against 4.17), fewer false
   claims (0.03 against 0.17 per reply), all required facts present (100% against 95%), 15%
   fewer words, 63% less injected context and 16% lower cost per reply. The skill now loads
   on its own when a reader asks for this style (3 of 4 prompts, against 0 of 4).
2. **Release gate passed:** precision did not regress against v0.2.0.
3. **Open issue:** the control scored about 0.2 higher on usefulness than every Phronesis
   version, in all three judgings. The judge's notes point to missing next steps after a
   false premise and fewer optional details. `v0.3.0-alt` tried to fix this through rule 7;
   usefulness did not change (4.57) and certainty dropped (100% to 67% of replies that needed
   it), so it was not shipped.
4. **v0.2.0 was worse than no Phronesis** on clarity and usefulness, mainly through unasked
   closing offers, time estimates and side notes. v0.3.0 removes those.

## Judge noise

The judge scored the same control and v0.2.0 replies twice, in separate runs. It gave the
same score in 67% to 80% of cases, and the mean absolute difference per reply was 0.2 to 0.33.
Treat judge differences under about 0.2 between arms as noise; the deterministic checks below
the precision table do not have this problem.

## Full report

Generated 2026-10-02. Suite: 10 tasks. Arms: control, v0.2.0, v0.3.0, v0.3.0-alt.

## Precision

| Metric | control | v0.2.0 | v0.3.0 | v0.3.0-alt |
|---|---|---|---|---|
| Required facts present | 97% | 95% | 100% | 97% |
| Replies with a forbidden claim | 0% | 3% | 0% | 0% |
| Judge: correctness (1-5) | 4.73 (sd 0.45) | 4.87 (sd 0.35) | 4.93 (sd 0.25) | 4.83 (sd 0.38) |
| Judge: false claims per reply (checked against code) | 0.17 | 0.17 | 0.03 | 0.10 |
| Judge: usefulness (1-5) | 4.77 | 4.57 | 4.60 | 4.57 |
| Judge: clarity for ADHD/autistic reader (1-5) | 4.53 | 4.17 | 4.37 | 4.47 |

## Shape (pass rate of the checks that apply)

| Check | control | v0.2.0 | v0.3.0 | v0.3.0-alt |
|---|---|---|---|---|
| All shape checks | 87% | 96% | 96% | 98% |
| answerInLine1 | 100% | 100% | 100% | 100% |
| noPreamble | 100% | 100% | 100% | 100% |
| noPleasantries | 100% | 100% | 100% | 100% |
| listAtMost5 | 80% | 93% | 97% | 100% |
| plainAscii | 100% | 100% | 100% | 100% |
| certaintyStated | 17% | 83% | 100% | 67% |
| timeInUnits | 100% | 100% | 100% | 100% |
| nextActionLast | 39% | 83% | 67% | 89% |
| asksBeforeActing | 100% | 100% | 100% | 100% |
| deliverableOnly | 100% | 100% | 100% | 100% |
| Words before the answer (mean) | 1.9 | 2.3 | 2.4 | 2.4 |

## Cost and speed (mean per reply)

| Metric | control | v0.2.0 | v0.3.0 | v0.3.0-alt |
|---|---|---|---|---|
| Words | 253 (sd 149) | 272 (sd 153) | 230 (sd 142) | 243 (sd 133) |
| Output tokens | 1386 | 1430 | 1210 | 1281 |
| Input tokens | 64719 | 76534 | 57445 | 58241 |
| Injected context (chars) | 0 | 8615 | 3007 | 3167 |
| Latency (s) | 15.6 | 16.0 | 14.0 | 15.0 |
| Cost (USD) | 0.1205 | 0.1948 | 0.1644 | 0.1582 |
| Tool turns | 5.5 | 5.3 | 4.6 | 5.2 |

## Per category: required facts / judge correctness

| Category | control | v0.2.0 | v0.3.0 | v0.3.0-alt |
|---|---|---|---|---|
| fact lookup | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 5.0 |
| false premise | 100% / 5.0 | 92% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| debug, uncertain | 100% / 4.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| decision | 67% / 5.0 | 67% / 5.0 | 100% / 5.0 | 67% / 5.0 |
| estimate | 100% / 4.7 | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 |
| deliverable | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| fact preservation | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| destructive | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 |
| plan | 100% / 4.3 | 100% / 4.7 | 100% / 5.0 | 100% / 4.0 |

## Skill triggering

| Arm | Skill | Should load: loaded (recall) | Should not load: stayed out | Precision |
|---|---|---|---|---|
| v0.2.0 | claude-setup-audit | 3/3 | 3/3 | 100% |
| v0.2.0 | phronesis | 0/4 | 3/3 | - |
| v0.3.0 | claude-setup-audit | 3/3 | 3/3 | 100% |
| v0.3.0 | phronesis | 3/4 | 3/3 | 100% |
| v0.3.0-alt | claude-setup-audit | 3/3 | 3/3 | 100% |
| v0.3.0-alt | phronesis | 3/4 | 3/3 | 100% |

## Setup audit (scan mode)

| Arm | Runs | Gates correct | Private files opened | Report delivered (file + chat) | Tool calls | Input tokens | Duration (s) | Cost (USD) |
|---|---|---|---|---|---|---|---|---|
| v0.2.0 | 2 | 6/6, 6/6 | 0, 0 | 2/2 | 20 | 336912 | 67 | 0.541 |
| v0.3.0 | 2 | 6/6, 6/6 | 0, 0 | 2/2 | 25 | 309032 | 64 | 0.491 |
| v0.3.0-alt | 2 | 6/6, 6/6 | 0, 0 | 2/2 | 25 | 309032 | 64 | 0.491 |

## Release gate: v0.3.0 against v0.2.0

| Condition | Result |
|---|---|
| Judge correctness drop at most 0.1 | pass |
| False claims per reply rise at most 0.1 | pass |
| Required facts drop at most 2 points | pass |

**Gate: pass**

## Notes on the method

- `nextActionLast` applies only to tasks where the reader has something to do. It was first
  applied to every task; that rewarded padding the judge marked down, so all arms were
  rescored from their saved text with the corrected rule (`bench.mjs rescore`).
- `asksBeforeActing` first required a question mark; replies that asked for confirmation in a
  statement ("I need a yes from you first") were counted as failures, so the check was
  widened and all arms rescored.
- `v0.3.0` and `v0.3.0-alt` differ only in SKILL.md and core.md; their skill descriptions and
  the audit skill are identical, so the trigger and audit runs were made once and apply to
  both.
- Cost per reply is higher with Phronesis than without, even though v0.3.0 uses fewer input
  tokens. Likely cause, not verified: prompt-cache writes for the added system prompt in
  one-turn runs, which a longer session amortises.
