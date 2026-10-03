<div align="center">

<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/phronesis-logo-dark.svg">
    <img src="assets/phronesis-logo-light.svg" alt="Phronesis" width="600">
  </picture>
</h1>

Replies from your AI coding agent that are easy to read and easy to act on:<br>
the answer first, one step at a time, nothing left to guess.<br>
Designed around attention and clarity. MIT license.

*Phronesis* is Greek for practical wisdom: knowing what to do next.

</div>

One plugin, two skills:
- **phronesis** shapes every reply.
- **phronesis-audit** checks your repository's Claude Code setup, in the same style.

**Status:** early version. Tested on Claude Code and OpenCode in parts. Other agents are
not tested yet.

## Install

```
claude plugin marketplace add thcp/phronesis
claude plugin install phronesis@phronesis
```

Then type `/phronesis:phronesis` for the reply style, or `/phronesis:phronesis-audit`
for the audit. Say "stop phronesis" to turn the style off.

- **Always on, no typing:** create the file `~/.claude/.phronesis-always` (needs Node). Each
  session then starts with a compact core of the rules (about 900 tokens), and each prompt gets
  a one-line reminder (about 40 tokens) so the style does not fade in long sessions.
- **Length:** say `phronesis short` or `phronesis detailed`. `phronesis normal` is the default.
- **Other agents** (Codex, OpenCode, Gemini CLI, Qwen Code, Kimi Code, Antigravity, Cursor):
  see [INSTALL.md](INSTALL.md).

## What it does

One promise: **brief in volume, complete in precision.** Fewer words, never fewer facts.

| Without | With |
|---|---|
| "Great question! I took a look and it seems like the reporter might be onto something." | "**Yes, the stutter bug is real.**" |
| "Things can kind of get out of sync over time." | "The gap grows by 0.25 s every second. The audio runs out after about 50 s." |
| "Let me know if you'd like me to dig deeper!" | "**Next action:** reply on #701 confirming the bug. About 5 minutes." |

A full example is in [examples/phronesis.md](examples/phronesis.md).

## The rules

1. Answer or next action first.
2. Numbered steps, one action each.
3. Say where things stand, every turn.
4. Time in real units, with the condition.
5. Literal language: no idioms, metaphors or sarcasm.
6. The same word for the same thing.
7. The same shape every time.
8. Announce changes before acting.
9. A reason with every recommendation.
10. State certainty: verified, not verified, or unknown.
11. Show finished work, with evidence.
12. At most five items per list.
13. One topic per reply.
14. No preamble, no recap, no pleasantries.
15. Keep code changes predictable.
16. Keep facts exact when shortening.
17. Plans and estimates name every place the change touches.

Decisions come as multiple choice, only when your answer changes what happens next.
Full rules and reasons: [SKILL.md](skills/phronesis/SKILL.md).

## Research

Each rule rests on published work: working memory and time perception in ADHD, studies of
autistic and ADHD software engineers, accessible writing, and how neurodivergent people use
AI. The papers, with links and limits, are in [SOURCES.md](skills/phronesis/SOURCES.md).

**Benefits for readers are expected, not measured.** None of the sources tested this plugin,
and the benchmark below measures replies, not people. This is not medical advice: the sources
describe groups, not any one person.

## Benchmark

[bench/](bench/README.md) runs the same tasks with no Phronesis and with each version, in
isolated headless sessions, and measures precision (required facts, false claims checked
against the code by a blind judge), shape (answer in line 1, preamble, list length, certainty,
plain ASCII), cost (tokens, latency) and skill triggering. Results for this release:
[bench/results/RESULTS-v0.4.0.md](bench/results/RESULTS-v0.4.0.md); for v0.3.0:
[bench/results/RESULTS.md](bench/results/RESULTS.md). Against Ponytail and caveman:
[bench/results/COMPARISON.md](bench/results/COMPARISON.md).

## phronesis-audit

Claude Code only, nothing extra to install. It checks your repository, picks the skills,
agents and hooks that fit, flags missing tests, trims your CLAUDE.md, and plans how to
measure whether the setup helps. It installs nothing until you say yes.

The first time you open a git repository with the plugin on, it answers your first message
and then offers a read-only scan: yes, not now (asks again after 7 days), or never for this
repository. It never opens PDFs, `.env` files, keys or data folders.

The full report goes to `.claude/audit-report.md`. Chat gets a verdict, the top five
recommendations and a numbered plan.

Two tested scripts ship with it, so the audit does not rely on judgement alone:
- `scripts/check-setup.mjs`: deterministic checks of skill frontmatter limits, the skill
  listing budget, CLAUDE.md size and imports, broad permissions, risky hooks, agent tools and
  models, and which private files exist (by name only). `--usage` reads token counts and skill
  names from your session logs, never message text.
- `scripts/drift-check.mjs`: the session-start check the audit installs. It reports new
  commits on adopted sources, changed documentation pages and retired model IDs, once a day,
  and stays silent when offline or when nothing changed.

## Make it yours

Fork, edit [`skills/phronesis/SKILL.md`](skills/phronesis/SKILL.md), reinstall. If you add
a rule, add its reason too.

## Credits and licence

Builds on [i-have-adhd](https://github.com/ayghri/i-have-adhd) by Ayoub Ghriss (MIT). Its
notice is in [NOTICE](NOTICE). This repository is MIT licensed, see [LICENSE](LICENSE).
