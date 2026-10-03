# Benchmark results: v0.5.0

Run on 2026-10-03 with `bench/` (see [bench/README.md](../README.md)), Claude Code 2.1, model
pinned to `claude-opus-5-5`, on the same private application and suite as
[COMPARISON.md](COMPARISON.md), with the Agent tool available to every arm. Aggregate numbers only.

**Arms.** `control`: no plugin. `rc3` = v0.4.0. `rc3t`: v0.4.0 code tasks again, with tool timing.
`rc5`, `rc6`: candidates that were not shipped. `rc7` = v0.5.0. `ponytail` and `caveman` at the
same commits as in COMPARISON.md. The judge re-scored every arm in this run, so compare numbers
only inside this report, not with RESULTS-v0.4.0.md.

## What changed from v0.4.0, and why

1. Rule 7: the next action is one line, "**Next (recommended):** X."; replies are sized to the
   question; shortening cuts padding and never uses fragments.
2. `phronesis-audit` (was `claude-setup-audit`): code work gets effort medium at the lowest;
   each effort rule says whether it comes from Anthropic's effort page or is this skill's own.
3. Benchmark: tool calls are timed, and the model is pinned so a changed default cannot mix
   models in one comparison.

Rule 11 (code changes) is unchanged from v0.4.0: it is the rule that protects code quality.

## Summary

1. **Question replies cost less.** Warm-cache cost per reply is 36.5% below no plugin (paired
   95% interval -53.9% to -19.9%, 20 pairs) and 30.4% below v0.4.0 (-47.9% to -13.1%).
   Words per reply: 222 (no plugin 238). Shape checks passed: 95% (no plugin 87%).
2. **Code quality is the best of all arms:** no run broke existing tests (0 of 9; no plugin 4 of
   9), judge correctness 5.00, minimality 4.56, usefulness 4.78. With 9 runs, 0% is not proof:
   the v0.4.0 wording measured 11% and 22% in two samples, so expect 10-20%.
3. **Code is not faster or cheaper than no plugin.** Time per task 70.5 s against 51.5 s
   (+37%, interval -33% to +93%, 9 pairs); warm cost +15.7% (interval -45% to +71%, 6 pairs).
   Against v0.4.0, time is 8.7% lower and cost 3.4% lower, both inside the noise. Tests run
   3.1 times per task and take 26.1 s; the time of the other arms was not measured, so the
   share of the gap that is tests is not verified.
4. **Clarity:** 4.53, level with no plugin (4.53); Ponytail scored 4.63. The gap is inside the
   judge's noise of about 0.2.
5. **Targets missed:** code time of 55 s or less, code cost within +5% of no plugin.

## Development history (same suite)

| Candidate | Change | Outcome |
|---|---|---|
| rc5 | Search tests first, verify once, rerun only failing files | Code 43 s but 33% broke tests; cost +22% |
| rc6 | rc5 plus "verify after the last edit" | Not usable as measured: 44% broke tests, correctness 4.00, usefulness 3.44 |
| rc7 = v0.5.0 | v0.4.0 rule 11 restored, rule 7 kept | Best code quality; code time and cost not met |

An earlier rc6 run used the wrong model (Sonnet 5.5, a changed default) and was discarded.

## Full report


Generated 2026-10-03. Suite: 10 tasks. Arms: control, rc3, rc3t, rc5, rc6, rc7, ponytail, caveman.

## Precision

| Metric | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| Required facts present | 100% | 100% | - | 100% | 97% | 100% | 100% | 100% |
| Replies with a forbidden claim | 0% | 0% | - | 0% | 0% | 0% | 0% | 0% |
| Judge: correctness (1-5) | 4.83 (sd 0.38) | 4.83 (sd 0.38) | - (sd -) | 4.83 (sd 0.46) | 4.90 (sd 0.31) | 4.83 (sd 0.38) | 4.90 (sd 0.31) | 4.63 (sd 0.49) |
| Judge: false claims per reply (checked against code) | 0.13 | 0.13 | - | 0.23 | 0.00 | 0.10 | 0.10 | 0.20 |
| Judge: usefulness (1-5) | 4.57 | 4.57 | - | 4.60 | 4.50 | 4.50 | 4.67 | 4.37 |
| Judge: clarity for ADHD/autistic reader (1-5) | 4.53 | 4.47 | - | 4.57 | 4.63 | 4.53 | 4.63 | 4.30 |

## Shape (pass rate of the checks that apply)

| Check | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| All shape checks | 87% | 92% | - | 96% | 98% | 95% | 89% | 90% |
| answerInLine1 | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| noPreamble | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| noPleasantries | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| listAtMost5 | 87% | 83% | - | 90% | 93% | 93% | 83% | 83% |
| plainAscii | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| certaintyStated | 0% | 67% | - | 50% | 83% | 83% | 0% | 17% |
| timeInUnits | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| nextActionLast | 33% | 67% | - | 94% | 94% | 78% | 61% | 72% |
| asksBeforeActing | 100% | 67% | - | 100% | 100% | 67% | 100% | 67% |
| deliverableOnly | 100% | 100% | - | 100% | 100% | 100% | 100% | 100% |
| Words before the answer (mean) | 2.3 | 2.3 | - | 2.4 | 2.4 | 2.2 | 2.3 | 1.7 |

## Cost and speed (mean per reply)

| Metric | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| Words | 238 (sd 138) | 238 (sd 145) | - (sd -) | 234 (sd 143) | 224 (sd 129) | 222 (sd 133) | 231 (sd 132) | 221 (sd 131) |
| Output tokens | 1203 | 1289 | - | 1189 | 1192 | 1239 | 1201 | 1154 |
| Input tokens (all) | 68472 | 66285 | - | 64541 | 68215 | 68648 | 73309 | 67593 |
|   uncached | 8 | 7 | - | 7 | 7 | 7 | 7 | 7 |
|   cache write | 13343 | 11976 | - | 9860 | 10311 | 9174 | 13340 | 12753 |
|   cache read | 55121 | 54302 | - | 54675 | 57898 | 59468 | 59962 | 54833 |
| Injected context (chars) | 0 | 3730 | - | 3997 | 4088 | 3833 | 5228 | 5450 |
| Latency (s) | 13.9 | 14.3 | 0.0 | 13.0 | 32.3 | 15.6 | 14.0 | 12.6 |
| Cost (USD), all trials | 0.1419 | 0.1325 | - | 0.1136 | 0.1179 | 0.1101 | 0.1428 | 0.1361 |
| Cost (USD), warm cache (trial 2 and later) | 0.1309 | 0.1195 | - | 0.0811 | 0.0874 | 0.0831 | 0.1284 | 0.1279 |
| Tool turns | 4.9 | 5.0 | - | 4.5 | 4.7 | 4.7 | 5.1 | 4.5 |

## Cost by token type (mean USD per reply)

Fitted prices per million tokens: cache write $8.00, cache read $0.20, output $20.00. Fit error: 0% of billed cost.

| Part | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| cache write | 0.1067 | 0.0958 | 0.0000 | 0.0789 | 0.0825 | 0.0734 | 0.1067 | 0.1020 |
| cache read | 0.0110 | 0.0109 | 0.0000 | 0.0110 | 0.0116 | 0.0119 | 0.0120 | 0.0110 |
| output | 0.0241 | 0.0258 | 0.0000 | 0.0238 | 0.0238 | 0.0248 | 0.0240 | 0.0231 |

## Per category: required facts / judge correctness

| Category | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| fact lookup | 100% / 5.0 | 100% / 4.7 | - / - | 100% / 4.7 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| false premise | 100% / 5.0 | 100% / 5.0 | - / - | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| debug, uncertain | 100% / 4.7 | 100% / 4.7 | - / - | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 | 100% / 4.3 |
| decision | 100% / 5.0 | 100% / 4.7 | - / - | 100% / 5.0 | 67% / 5.0 | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 |
| estimate | 100% / 4.3 | 100% / 5.0 | - / - | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 |
| deliverable | 100% / 5.0 | 100% / 5.0 | - / - | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| fact preservation | 100% / 5.0 | 100% / 5.0 | - / - | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 4.3 |
| destructive | 100% / 4.7 | 100% / 4.7 | - / - | 100% / 5.0 | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 | 100% / 4.3 |
| plan | 100% / 4.7 | 100% / 4.7 | - / - | 100% / 4.0 | 100% / 4.3 | 100% / 4.7 | 100% / 4.7 | 100% / 4.0 |

## Code tasks

| Metric | control | rc3 | rc3t | rc5 | rc6 | rc7 | ponytail | caveman |
|---|---|---|---|---|---|---|---|---|
| Runs | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Hidden acceptance test passed | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Runs with new test failures | 44% | 11% | 22% | 33% | 44% | 0% | 22% | 22% |
| Type check passed | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| Changed source when none was needed | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% |
| Source lines changed (mean) | 8.2 | 9.0 | 9.6 | 9.2 | 9.6 | 7.7 | 8.1 | 7.0 |
| Test lines changed (mean) | 9.7 | 8.8 | 10.6 | 8.6 | 9.4 | 9.2 | 8.1 | 8.1 |
| Judge: correctness | 4.22 | 4.56 | 4.89 | 4.44 | 4.00 | 5.00 | 4.22 | 4.22 |
| Judge: minimality | 4.44 | 4.22 | 4.11 | 4.33 | 4.22 | 4.56 | 4.22 | 4.44 |
| Judge: usefulness | 3.89 | 4.33 | 4.22 | 4.00 | 3.44 | 4.78 | 3.78 | 4.00 |
| Judge: clarity | 4.67 | 4.00 | 4.00 | 4.33 | 4.67 | 4.67 | 4.44 | 4.44 |
| Output tokens | 4295 | 4874 | 5666 | 4643 | 5040 | 4883 | 4440 | 4070 |
| Cost (USD), all trials | 0.3310 | 0.3754 | 0.4325 | 0.3645 | 0.4017 | 0.3696 | 0.3493 | 0.3297 |
| Cost (USD), warm cache (trial 2 and later) | 0.3011 | 0.3606 | 0.4204 | 0.3679 | 0.3941 | 0.3483 | 0.3497 | 0.3864 |
| Latency (s) | 51.5 | 77.2 | 91.5 | 42.8 | 46.6 | 70.5 | 52.2 | 48.0 |
| Test runs per task | - | - | 3.4 | 1.4 | 2.0 | 3.1 | - | - |
| Time in test runs (s) | 0.0 | 0.0 | 39.4 | 1.0 | 0.4 | 26.1 | 0.0 | 0.0 |
| Time in all tools (s) | 0.0 | 0.0 | 47.5 | 2.0 | 1.5 | 34.6 | 0.0 | 0.0 |
