# Comparison: Phronesis, Ponytail, caveman and no plugin

Run on 2026-10-02 with `bench/` (see [bench/README.md](../README.md)), Claude Code 2.1.287, the
plan's default model, on the same private TypeScript application as
[RESULTS.md](RESULTS.md). Aggregate numbers only; the tasks and raw outputs stay private.

**Arms.** `control`: no plugin. `phronesis`: v0.3.0. `ponytail`: DietrichGebert/ponytail at
e3ba2aa. `caveman`: JuliusBrussee/caveman at b39c908. Each plugin ran in its default always-on
mode, through its own hooks.

**Suite.** 10 question tasks (3 trials each) and 3 code tasks (3 trials each): a small
constant change that touches tests and translations, a new helper function with a test, and a
request for an endpoint that already exists. Code runs edit a fresh clone; a hidden acceptance
test, the full test suite (only new failures count) and the type check run afterwards.

## Summary

1. **No plugin saves a statistically clear amount of tokens or cost on these tasks.** Paired
   warm-cache cost against no plugin, with 95% intervals:

   | Plugin | Questions (20 pairs) | Code (6 pairs) | Question output tokens |
   |---|---|---|---|
   | caveman | -10.4% (-22.9% to +2.0%) | +3.6% (-7.2% to +14.4%) | -5.4% |
   | phronesis | -7.1% (-19.4% to +5.3%) | -13.7% (-44.3% to +16.9%) | -1.5% |
   | ponytail | -2.4% (-18.2% to +13.3%) | +10.1% (+3.1% to +17.2%) | -3.4% |

   Ponytail's published -20% cost was not reproduced here. Likely reason, not verified: its
   benchmark used Haiku 4.5 on feature tasks where models over-build; these tasks are small.
2. **Phronesis** made the fewest false claims (0.03 per reply), is the only one that states
   certainty when the answer is uncertain (83% of replies that needed it), and made the
   smallest code changes with the best judge correctness and minimality. It scored lowest on
   question usefulness (4.47) and clarity (4.27), and was slower than no plugin on code tasks.
3. **Ponytail** scored best on question usefulness (4.77) and clarity (4.67).
4. **caveman** wrote the shortest replies, but made the most false claims (0.17 per reply) and
   asked before the destructive request half as often as the others (33% against 67%).

## Limits

- Judge scores move by about 0.2 when the same replies are judged twice; smaller gaps are noise.
- Code tasks have 9 runs per arm (6 for warm cost); treat the code ranking as a hint.
- Some "new test failures" were flaky tests unrelated to the change; one real miss (a test
  describing the configuration that also needed updating) happened in every arm.

## Full report

Generated 2026-10-02. Suite: 10 tasks. Arms: control, phronesis, ponytail, caveman.

## Precision

| Metric | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| Required facts present | 97% | 97% | 100% | 98% |
| Replies with a forbidden claim | 0% | 0% | 0% | 0% |
| Judge: correctness (1-5) | 4.80 (sd 0.41) | 4.87 (sd 0.35) | 4.80 (sd 0.41) | 4.70 (sd 0.53) |
| Judge: false claims per reply (checked against code) | 0.13 | 0.03 | 0.10 | 0.17 |
| Judge: usefulness (1-5) | 4.73 | 4.47 | 4.77 | 4.67 |
| Judge: clarity for ADHD/autistic reader (1-5) | 4.57 | 4.27 | 4.67 | 4.50 |

## Shape (pass rate of the checks that apply)

| Check | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| All shape checks | 88% | 94% | 88% | 90% |
| answerInLine1 | 100% | 100% | 100% | 100% |
| noPreamble | 97% | 100% | 100% | 100% |
| noPleasantries | 100% | 100% | 100% | 100% |
| listAtMost5 | 83% | 93% | 83% | 87% |
| plainAscii | 100% | 100% | 100% | 100% |
| certaintyStated | 17% | 83% | 0% | 0% |
| timeInUnits | 100% | 100% | 100% | 100% |
| nextActionLast | 56% | 61% | 50% | 78% |
| asksBeforeActing | 67% | 67% | 67% | 33% |
| deliverableOnly | 100% | 100% | 100% | 100% |
| Words before the answer (mean) | 2.5 | 2.3 | 2.3 | 1.0 |

## Cost and speed (mean per reply)

| Metric | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| Words | 253 (sd 146) | 247 (sd 145) | 240 (sd 140) | 221 (sd 140) |
| Output tokens | 1301 | 1297 | 1267 | 1228 |
| Input tokens (all) | 60703 | 65933 | 68958 | 63886 |
|   uncached | 7 | 8 | 7 | 7 |
|   cache write | 9893 | 9511 | 10637 | 10006 |
|   cache read | 50803 | 56415 | 58314 | 53873 |
| Injected context (chars) | 0 | 3015 | 5228 | 5450 |
| Latency (s) | 15.0 | 14.2 | 14.2 | 13.6 |
| Cost (USD), all trials | 0.1153 | 0.1133 | 0.1221 | 0.1154 |
| Cost (USD), warm cache (trial 2 and later) | 0.0993 | 0.0923 | 0.0969 | 0.0889 |
| Tool turns | 4.9 | 5.2 | 5.0 | 4.8 |

## Cost by token type (mean USD per reply)

Fitted prices per million tokens: cache write $8.00, cache read $0.20, output $20.01. Fit error: 0% of billed cost.

| Part | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| cache write | 0.0791 | 0.0761 | 0.0851 | 0.0800 |
| cache read | 0.0102 | 0.0113 | 0.0117 | 0.0108 |
| output | 0.0260 | 0.0260 | 0.0253 | 0.0246 |

## Per category: required facts / judge correctness

| Category | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| fact lookup | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| false premise | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 92% / 5.0 |
| debug, uncertain | 100% / 4.7 | 100% / 5.0 | 100% / 4.7 | 100% / 4.3 |
| decision | 67% / 4.7 | 67% / 5.0 | 100% / 4.7 | 100% / 5.0 |
| estimate | 100% / 5.0 | 100% / 5.0 | 100% / 4.7 | 100% / 4.7 |
| deliverable | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 |
| fact preservation | 100% / 5.0 | 100% / 5.0 | 100% / 5.0 | 100% / 4.3 |
| destructive | 100% / 4.7 | 100% / 4.0 | 100% / 4.3 | 100% / 4.0 |
| plan | 100% / 4.0 | 100% / 4.7 | 100% / 4.7 | 100% / 4.7 |

## Code tasks

| Metric | control | phronesis | ponytail | caveman |
|---|---|---|---|---|
| Runs | 9 | 9 | 9 | 9 |
| Hidden acceptance test passed | 100% | 100% | 100% | 100% |
| Runs with new test failures | 22% | 33% | 11% | 11% |
| Type check passed | 100% | 100% | 100% | 100% |
| Changed source when none was needed | 0% | 0% | 0% | 0% |
| Source lines changed (mean) | 7.6 | 6.6 | 7.4 | 8.7 |
| Test lines changed (mean) | 9.4 | 8.4 | 8.9 | 9.1 |
| Judge: correctness | 4.33 | 4.67 | 4.56 | 4.67 |
| Judge: minimality | 4.44 | 4.67 | 4.67 | 4.33 |
| Judge: usefulness | 4.11 | 4.44 | 4.22 | 4.44 |
| Judge: clarity | 4.56 | 4.11 | 4.56 | 4.44 |
| Output tokens | 3906 | 3909 | 4085 | 4432 |
| Cost (USD), all trials | 0.2981 | 0.3040 | 0.3306 | 0.3425 |
| Cost (USD), warm cache (trial 2 and later) | 0.3249 | 0.2803 | 0.3578 | 0.3365 |
| Latency (s) | 35.4 | 46.5 | 52.5 | 50.1 |
