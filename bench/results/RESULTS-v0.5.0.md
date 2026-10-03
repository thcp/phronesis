# Benchmark results: v0.5.0

Run on 2026-10-03 with `bench/` (see [bench/README.md](../README.md)), Claude Code 2.1, model
pinned to `claude-opus-5-5`, on the same private application and suite as
[COMPARISON.md](COMPARISON.md), with the Agent tool available to every arm. Aggregate numbers only.

**Arms.** `control`: no plugin. `v0.4.0` and `v0.5.0`: the two releases. `ponytail` and `caveman`
at the same commits as in COMPARISON.md. The judge re-scored every arm in this run, so compare
numbers only inside this report, not with RESULTS-v0.4.0.md.

## Summary

1. **Code: not faster or cheaper than no plugin, and breakage is the main gain.** Time per task
   is 70.5 s against 51.5 s with no plugin (+37%, paired 95% interval -33% to +93%, 9 pairs).
   Warm-cache cost is +15.7% (interval -45% to +71%, 6 pairs). Against v0.4.0, time is 8.7%
   lower and cost 3.4% lower, both inside the noise. These two targets (55 s or less, within +5%
   of no plugin) were missed.
2. **Code quality: highest scores, but only breakage is a clear difference.** No run broke
   existing tests (0 of 9; no plugin 4 of 9; Fisher exact test p about 0.08, not significant at
   5%). The judge scores for correctness (5.00), minimality (4.56) and usefulness (4.78) are
   the highest, but gaps between arms are within the judge's noise of about 0.2. The v0.4.0
   wording of the code rule measured 11% and 22% breakage in two samples, so expect 10-20%.
3. **Question replies cost less.** Warm-cache cost per reply is 36.5% below no plugin (paired
   95% interval -53.9% to -19.9%, 20 pairs) and 30.4% below v0.4.0 (-47.9% to -13.1%).
   Words per reply: 222 (no plugin 238). Shape checks passed: 95% (no plugin 87%).
   Weak spot: asking before a risky action passed in 67% of replies, the same as v0.4.0 and
   below the 100% of no plugin and Ponytail.
4. **Clarity:** 4.53, level with no plugin (4.53); Ponytail scored 4.63. The gap is inside the
   judge's noise.
5. **Why code time stays high:** tests run 3.1 times per task and take 26.1 s. The time of the
   other arms was not measured, so how much of the gap is tests is not verified.

## What changed from v0.4.0, and why

1. Rule 7: the next action is one line, "**Next (recommended):** X."; replies are sized to the
   question; shortening cuts padding and never uses fragments.
2. `phronesis-audit` (was `claude-setup-audit`): code work gets effort medium at the lowest;
   each effort rule says whether it comes from Anthropic's effort page or is this skill's own.
3. Benchmark: tool calls are timed, and the model is pinned so a changed default cannot mix
   models in one comparison.

Rule 11 (code changes) is unchanged from v0.4.0: it is the rule that protects code quality.

## Development history (same suite)

| Candidate | Change | Outcome |
|---|---|---|
| rc5 | Search tests first, verify once, rerun only failing files | Code 43 s but 33% broke tests; cost +22% |
| rc6 | rc5 plus "verify after the last edit" | Not usable: 44% broke tests, correctness 4.00, usefulness 3.44 |
| rc7 = v0.5.0 | v0.4.0 code rule restored, rule 7 kept | Highest code scores; code time and cost not met |

An earlier rc6 run used the wrong model (Sonnet 5.5, a changed default) and was discarded.

## Full report

Tool timing for v0.4.0 (test runs, seconds in tests) comes from a re-run of its code tasks with timing
switched on. The other arms were not timed. Dollar figures are API-equivalent usage; the runs used a
subscription, so nothing was billed per token.

Generated 2026-10-03. Suite: 10 tasks. Arms: control, v0.4.0, v0.5.0, ponytail, caveman.

## Precision

| Metric | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| Required facts present | 100% | 100% | 100% | 100% | 100% |
| Replies with a forbidden claim | 0% | 0% | 0% | 0% | 0% |
| Judge: correctness (1-5) | 4.83 (sd 0.38) | 4.83 (sd 0.38) | 4.83 (sd 0.38) | 4.90 (sd 0.31) | 4.63 (sd 0.49) |
| Judge: false claims per reply (checked against code) | 0.13 | 0.13 | 0.10 | 0.10 | 0.20 |
| Judge: usefulness (1-5) | 4.57 | 4.57 | 4.50 | 4.67 | 4.37 |
| Judge: clarity for ADHD/autistic reader (1-5) | 4.53 | 4.47 | 4.53 | 4.63 | 4.30 |

## Shape (pass rate of the checks that apply)

| Check | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| All shape checks | 87% | 92% | 95% | 89% | 90% |
| answerInLine1 | 100% | 100% | 100% | 100% | 100% |
| noPreamble | 100% | 100% | 100% | 100% | 100% |
| noPleasantries | 100% | 100% | 100% | 100% | 100% |
| listAtMost5 | 87% | 83% | 93% | 83% | 83% |
| plainAscii | 100% | 100% | 100% | 100% | 100% |
| certaintyStated | 0% | 67% | 83% | 0% | 17% |
| timeInUnits | 100% | 100% | 100% | 100% | 100% |
| nextActionLast | 33% | 67% | 78% | 61% | 72% |
| asksBeforeActing | 100% | 67% | 67% | 100% | 67% |
| deliverableOnly | 100% | 100% | 100% | 100% | 100% |
| Words before the answer (mean) | 2.3 | 2.3 | 2.2 | 2.3 | 1.7 |

## Cost and speed (mean per reply)

| Metric | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| Words | 238 (sd 138) | 238 (sd 145) | 222 (sd 133) | 231 (sd 132) | 221 (sd 131) |
| Output tokens | 1203 | 1289 | 1239 | 1201 | 1154 |
| Input tokens (all) | 68472 | 66285 | 68648 | 73309 | 67593 |
| uncached | 8 | 7 | 7 | 7 | 7 |
| cache write | 13343 | 11976 | 9174 | 13340 | 12753 |
| cache read | 55121 | 54302 | 59468 | 59962 | 54833 |
| Injected context (chars) | 0 | 3730 | 3833 | 5228 | 5450 |
| Latency (s) | 13.9 | 14.3 | 15.6 | 14.0 | 12.6 |
| Cost (USD), all trials | 0.1419 | 0.1325 | 0.1101 | 0.1428 | 0.1361 |
| Cost (USD), warm cache (trial 2 and later) | 0.1309 | 0.1195 | 0.0831 | 0.1284 | 0.1279 |
| Tool turns | 4.9 | 5.0 | 4.7 | 5.1 | 4.5 |

## Cost by token type (mean USD per reply)

Fitted prices per million tokens: cache write $8.00, cache read $0.20, output $20.00. Fit error: 0% of billed cost.

| Part | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| cache write | 0.1067 | 0.0958 | 0.0734 | 0.1067 | 0.1020 |
| cache read | 0.0110 | 0.0109 | 0.0119 | 0.0120 | 0.0110 |
| output | 0.0241 | 0.0258 | 0.0248 | 0.0240 | 0.0231 |

## Per category: required facts / judge correctness

| Category | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| fact lookup | 100% / 5.0 | 100% / 4.7 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| false premise | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| debug, uncertain | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.3 |
| decision | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 |
| estimate | 100% / 4.3 | 100% / 5.0 | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 |
| deliverable | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| fact preservation | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 4.3 |
| destructive | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.3 |
| plan | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.0 |

## Code tasks

| Metric | control | v0.4.0 | v0.5.0 | ponytail | caveman |
|---|---|---|---|---|---|
| Runs | 9 | 9 | 9 | 9 | 9 |
| Hidden acceptance test passed | 100% | 100% | 100% | 100% | 100% |
| Runs with new test failures | 44% | 11% | 0% | 22% | 22% |
| Type check passed | 100% | 100% | 100% | 100% | 100% |
| Changed source when none was needed | 0% | 0% | 0% | 0% | 0% |
| Source lines changed (mean) | 8.2 | 9.0 | 7.7 | 8.1 | 7.0 |
| Test lines changed (mean) | 9.7 | 8.8 | 9.2 | 8.1 | 8.1 |
| Judge: correctness | 4.22 | 4.56 | 5.00 | 4.22 | 4.22 |
| Judge: minimality | 4.44 | 4.22 | 4.56 | 4.22 | 4.44 |
| Judge: usefulness | 3.89 | 4.33 | 4.78 | 3.78 | 4.00 |
| Judge: clarity | 4.67 | 4.00 | 4.67 | 4.44 | 4.44 |
| Output tokens | 4295 | 4874 | 4883 | 4440 | 4070 |
| Cost (USD), all trials | 0.3310 | 0.3754 | 0.3696 | 0.3493 | 0.3297 |
| Cost (USD), warm cache (trial 2 and later) | 0.3011 | 0.3606 | 0.3483 | 0.3497 | 0.3864 |
| Latency (s) | 51.5 | 77.2 | 70.5 | 52.2 | 48.0 |
| Test runs per task | - | 3.4 | 3.1 | - | - |
| Time in test runs (s) | - | 39.4 | 26.1 | - | - |
| Time in all tools (s) | - | 47.5 | 34.6 | - | - |
