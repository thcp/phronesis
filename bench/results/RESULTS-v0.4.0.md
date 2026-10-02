# Benchmark results: v0.4.0

Run on 2026-10-02 with `bench/` (see [bench/README.md](../README.md)), Claude Code 2.1.287, the
plan's default model, on the same private application and suite as [COMPARISON.md](COMPARISON.md),
with the Agent tool available to every arm, as in real Claude Code. Aggregate numbers only.

**Arms.** `control`: no plugin. `v0.4.0`: this release. `v0.4.0+routing`: v0.4.0 plus two
Haiku helper agents for searches and long commands; measured and not shipped. `ponytail` and
`caveman` at the same commits as in COMPARISON.md.

## What changed from v0.3.0, and why

Each change answers a weakness the blind judge named in the earlier comparison:

1. After correcting a false premise, the reply says what to change now.
2. Checked is the default: evidence sits next to the claim, and only unchecked claims are labelled.
3. No asides unless they change the reader's decision; long replies get section labels.
4. Code changes update every affected test and run the full suite and type check, with the
   quietest output that shows failures; the report is short.
5. Rule 17: plans and estimates list every place the change touches.

## Summary

1. **Most correct.** Fewest false claims on questions (0.03 per reply) and the fewest runs that
   broke tests on code (11%, against 44% with no plugin).
2. **Not the cheapest or fastest on code.** v0.4.0 runs the full suite before calling a change
   done, so code tasks took 77 s against 52 s with no plugin, and cost about 20% more (95%
   interval -3.7% to +43.2%, 6 pairs). On questions it was the cheapest arm (-8.7%, interval
   -23.8% to +6.4%).
3. **Clarity:** Ponytail scored highest on question clarity (4.77 against 4.60); the gap is
   inside the judge's noise of about 0.2.
4. **Routing did not pay:** the helper agents were used in 6 of 39 runs, and code tasks became
   the most expensive (+55%) and slowest (90 s). Removed before release.

## Development history (same suite)

| Candidate | Change | Outcome |
|---|---|---|
| rc1 | The five changes above, plus "covering tests first, full suite once" | Code correctness fell to 3.89: runs skipped the full suite |
| rc2 | Full-suite verification restored | Best question scores; code slowest and +18% cost |
| rc3 = v0.4.0 | Quiet test output, short code reports | Code correctness 5.00 in its first run; cost unchanged |
| rc4 | rc3 plus helper-agent routing | Rejected (see above) |

## Full report

Generated 2026-10-02. Suite: 10 tasks. Arms: control, rc3, v0.4.0+routing, ponytail, caveman.

## Precision

| Metric | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| Required facts present | 100% | 100% | 97% | 100% | 100% |
| Replies with a forbidden claim | 0% | 0% | 0% | 0% | 0% |
| Judge: correctness (1-5) | 4.70 (sd 0.47) | 4.90 (sd 0.40) | 4.93 (sd 0.25) | 4.83 (sd 0.38) | 4.73 (sd 0.45) |
| Judge: false claims per reply (checked against code) | 0.13 | 0.03 | 0.07 | 0.10 | 0.13 |
| Judge: usefulness (1-5) | 4.57 | 4.60 | 4.67 | 4.70 | 4.47 |
| Judge: clarity for ADHD/autistic reader (1-5) | 4.57 | 4.60 | 4.43 | 4.77 | 4.27 |

## Shape (pass rate of the checks that apply)

| Check | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| All shape checks | 87% | 92% | 92% | 89% | 90% |
| answerInLine1 | 100% | 100% | 100% | 100% | 100% |
| noPreamble | 100% | 100% | 100% | 100% | 100% |
| noPleasantries | 100% | 100% | 100% | 100% | 100% |
| listAtMost5 | 87% | 83% | 87% | 83% | 83% |
| plainAscii | 100% | 100% | 100% | 100% | 100% |
| certaintyStated | 0% | 67% | 33% | 0% | 17% |
| timeInUnits | 100% | 100% | 100% | 100% | 100% |
| nextActionLast | 33% | 67% | 78% | 61% | 72% |
| asksBeforeActing | 100% | 67% | 67% | 100% | 67% |
| deliverableOnly | 100% | 100% | 100% | 100% | 100% |
| Words before the answer (mean) | 2.3 | 2.3 | 1.8 | 2.3 | 1.7 |

## Cost and speed (mean per reply)

| Metric | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| Words | 238 (sd 138) | 238 (sd 145) | 240 (sd 135) | 231 (sd 132) | 221 (sd 131) |
| Output tokens | 1203 | 1289 | 1375 | 1201 | 1154 |
| Input tokens (all) | 68472 | 66285 | 72369 | 73309 | 67593 |
|   uncached | 8 | 7 | 7 | 7 | 7 |
|   cache write | 13343 | 11976 | 12427 | 13340 | 12753 |
|   cache read | 55121 | 54302 | 59934 | 59962 | 54833 |
| Injected context (chars) | 0 | 3730 | 4052 | 5228 | 5450 |
| Latency (s) | 13.9 | 14.3 | 14.8 | 14.0 | 12.6 |
| Cost (USD), all trials | 0.1419 | 0.1325 | 0.1389 | 0.1428 | 0.1361 |
| Cost (USD), warm cache (trial 2 and later) | 0.1309 | 0.1195 | 0.1346 | 0.1284 | 0.1279 |
| Tool turns | 4.9 | 5.0 | 5.0 | 5.1 | 4.5 |

## Cost by token type (mean USD per reply)

Fitted prices per million tokens: cache write $8.00, cache read $0.20, output $20.00. Fit error: 0% of billed cost.

| Part | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| cache write | 0.1067 | 0.0958 | 0.0994 | 0.1067 | 0.1020 |
| cache read | 0.0111 | 0.0109 | 0.0120 | 0.0120 | 0.0110 |
| output | 0.0241 | 0.0258 | 0.0275 | 0.0240 | 0.0231 |

## Per category: required facts / judge correctness

| Category | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| fact lookup | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| false premise | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| debug, uncertain | 100% / 4.0 | 100% / 4.3 | 100% / 5.0 | 100% / 4.3 | 100% / 4.3 |
| decision | 100% / 5.0 | 100% / 4.7 | 67% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| estimate | 100% / 4.3 | 100% / 5.0 | 100% / 5.0 | 100% / 4.7 | 100% / 5.0 |
| deliverable | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| fact preservation | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 4.3 |
| destructive | 100% / 4.3 | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 |
| plan | 100% / 4.3 | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 | 100% / 4.0 |

## Code tasks

| Metric | control | v0.4.0 | v0.4.0+routing | ponytail | caveman |
|---|---|---|---|---|---|
| Runs | 9 | 9 | 9 | 9 | 9 |
| Hidden acceptance test passed | 100% | 100% | 100% | 100% | 100% |
| Runs with new test failures | 44% | 11% | 11% | 22% | 22% |
| Type check passed | 100% | 100% | 100% | 100% | 100% |
| Changed source when none was needed | 0% | 0% | 0% | 0% | 0% |
| Source lines changed (mean) | 8.2 | 9.0 | 9.4 | 8.1 | 7.0 |
| Test lines changed (mean) | 9.7 | 8.8 | 9.2 | 8.1 | 8.1 |
| Judge: correctness | 4.44 | 4.67 | 5.00 | 4.33 | 4.33 |
| Judge: minimality | 4.44 | 4.33 | 4.33 | 4.44 | 4.44 |
| Judge: usefulness | 4.11 | 4.44 | 4.89 | 4.22 | 4.22 |
| Judge: clarity | 4.67 | 4.00 | 4.22 | 4.44 | 4.56 |
| Output tokens | 4295 | 4874 | 6085 | 4440 | 4070 |
| Cost (USD), all trials | 0.3310 | 0.3754 | 0.4557 | 0.3493 | 0.3297 |
| Cost (USD), warm cache (trial 2 and later) | 0.3011 | 0.3606 | 0.4669 | 0.3497 | 0.3864 |
| Latency (s) | 51.5 | 77.2 | 90.3 | 52.2 | 48.0 |
