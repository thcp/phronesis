# Phronesis

- Before every commit: `node scripts/check.mjs` and the `node --test` line in `.github/workflows/ci.yml`; judge by exit code. `scripts/pre-commit-check.mjs` runs both as a Claude Code hook.
- `skills/phronesis/core.md` is the short copy of the rules in `skills/phronesis/SKILL.md` (injected by `hooks/always-on.mjs`). Change both together; `scripts/test/core-sync.test.mjs` fails when rule numbers or key phrases differ.
- Plain ASCII only in every file; `scripts/check.mjs` fails on em dashes, curly quotes and emoji.
- The private benchmark suite and its raw results live outside this repo. Never add them here; publish only aggregate numbers and task categories (see `bench/results/`).
- Benchmark comparisons keep the model pinned (`BENCH_MODEL` in `bench/lib/claude.mjs`); a run on another model is discarded.
- `.claude/` stays uncommitted.
