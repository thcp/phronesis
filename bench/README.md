# Phronesis benchmark

Measures whether a version of Phronesis makes replies better, and what it costs. It runs the
same tasks in isolated headless Claude Code sessions, once per arm, and compares them.

## What it measures

| Group | Metrics | How |
|---|---|---|
| Precision | required facts present; forbidden claims; correctness (1-5); false claims per reply | Regexes per task; a blind judge that reads the code to check each claim |
| Shape | answer in line 1; words before the answer; no preamble; no pleasantries; lists of at most 5; plain ASCII; certainty stated; time in real units; next action last; asks before a destructive action; deliverable only | Deterministic checks in `lib/metrics.mjs` (no model) |
| Usefulness and clarity | usefulness (1-5); clarity for an autistic and ADHD reader (1-5) | Blind judge |
| Cost | words, output tokens, input tokens, injected characters, latency, cost, tool turns | Claude Code's JSON output |
| Consistency | standard deviation of words and correctness across trials | Repeated trials |
| Triggering | per skill: recall (loads when it should) and precision (stays out when it should) | `triggers.json`, detected from the Skill tool call |
| Setup audit | gates reported correctly; private files opened; report delivered; tool calls; tokens; time | Scan mode on a fresh clone; tool calls inspected |

## Arms

- `name=none`: no Phronesis (the control).
- `name=git:<ref>`: the plugin as it was at a commit of this repository.
- `name=dir:<path>`: the plugin in a folder, for example `dir:.` for the working tree.

For reply tasks an arm injects exactly what its own hooks inject with always-on enabled: the
harness runs that version's `hooks/hooks.json` (SessionStart into the system prompt,
UserPromptSubmit next to the prompt).

## Isolation

Every run uses `claude -p --setting-sources project --strict-mcp-config
--no-session-persistence`: no user CLAUDE.md, rules, memory, plugins or MCP servers. Reply
runs get read-only tools (Read, Grep, Glob) in a clone of the target repository, so nothing is
changed. Audit runs get a fresh clone each (tracked files only, so untracked secrets such as
`.env` are never present).

## Suites

A suite is a folder with `tasks.json` (and `audit.json` for the audit). Each task has a
`prompt`, a `reference` answer checked against the code, and optional checks: `required` and
`forbidden` regexes, `answer_line1`, `needs_certainty`, `needs_estimate`,
`expects_confirmation`, `deliverable_only`, `expects_next_action`. `tasks.example.json` shows
the format. A suite about a private repository stays outside this repository; only the
aggregate report is published.

## Run

```
S=<suite folder>; O=<output folder>; W=<clone of the target repo>
node bench/bench.mjs replies  --suite $S --out $O --workspace $W --arm control=none --arm v1=git:<ref> --arm next=dir:. --trials 3
node bench/bench.mjs judge    --suite $S --out $O --workspace $W
node bench/bench.mjs triggers --out $O --arm v1=git:<ref> --arm next=dir:.
node bench/bench.mjs audit    --suite $S --out $O --repo <target repo> --arm v1=git:<ref> --arm next=dir:. --trials 2
node bench/bench.mjs report   --suite $S --out $O --gate v1,next
```

Every command is resumable: finished runs are skipped. `--tasks a,b` limits a run to some
tasks. `--concurrency` sets parallel runs (default 4). Runs use your Claude Code login and
plan; a full run of 10 tasks, 3 arms and 3 trials is about 90 replies and 30 judge calls.

## Release gate

Before tagging a release, run the benchmark against the previous release and pass `--gate
<previous>,<candidate>` to `report`. The candidate passes when, against the previous release,
judge correctness drops by no more than 0.1, false claims per reply rise by no more than 0.1,
and required facts drop by no more than 2 points. Shape and cost are reported but do not gate:
a release may trade them, never precision.

## Limits

- The judge is a model; it is blind to the arm and checks claims against the code, but it can
  still be wrong. Deterministic checks are reported separately for that reason.
- Single-turn tasks: fading over a long session is not measured.
- Headless runs cannot write inside `.claude/`, so the audit's report is scored as delivered
  when it is in the file or, as the skill's fallback allows, in chat.
- It measures replies, not readers. Whether replies help autistic and ADHD readers needs a
  study with people.
