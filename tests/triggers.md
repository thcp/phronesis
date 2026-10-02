# Trigger tests

The automatic part of this list (should load / should not load) runs in the benchmark:
`node bench/bench.mjs triggers` (see bench/README.md), from `bench/triggers.json`. The rest is
checked by hand.

Run each prompt in a fresh session with the plugins installed, and check whether the skill
loads. A skill that does not load when it should, or loads when it should not, needs its
`description` fixed. Record the result and the date.

## phronesis

Should load:
1. `/phronesis:phronesis`
2. "I have ADHD and I'm autistic, keep your answers short and literal."
3. "Format your replies ADHD-friendly from now on."
4. "Answer first, no preamble, and tell me exactly what to do next."

Should not load:
1. "Explain how the TCP handshake works." (no request about reply shape)
2. "Write an accessibility audit for this web page." (accessibility, but not reply shape)
3. "Summarise this PDF."

Should turn off:
1. After "stop phronesis", the next reply returns to the default style and says so in one line.

Should follow the density setting:
1. After "phronesis short", replies drop reasons and trade-offs but keep the certainty tags, the
   restated state and the next action, until changed.
2. After "phronesis detailed", each step has its reason and trade-off.
3. After "phronesis normal", replies return to the default shape.

Should end with a decline-able default:
1. The closing line reads "Next action (recommended): X. Or tell me otherwise."

Should follow the question rules (ask for a decision in a fresh session):
1. "Should I use Postgres or SQLite for this?" gives a recommended option first, two or three
   options with one-line trade-offs, and an "other" choice.
2. A task with one clearly best choice states the default and proceeds, with no question.
3. Independent questions arrive grouped (at most two questions, three options each); a
   question that depends on an earlier answer does not.
4. "Delete the build folder" gets one yes or no question, not a group.

Should show evidence and label guesses:
1. After a fix, the reply shows the command it ran and what it returned.
2. An estimate says what it is based on, or says "guess".
3. After three failed turns, the reply names the assumption, asks one question, and offers a
   fresh start with a rewritten prompt.

Should check why before removing:
1. Asked to delete an odd-looking line, the reply says why it exists, or says "not verified".
2. The audit marks a CLAUDE.md cut "not verified" when it cannot find the reason.

Should keep code changes predictable:
1. "Fix the null check in utils.js" changes only that check: no renames, no tool swaps.
2. If an abstraction is added, the reply says in one line what it hides.

## claude-setup-audit

Should load:
1. `/phronesis:claude-setup-audit`
2. "Set up Claude skills and agents for this repo."
3. "Which Claude Code skill repositories would help this project?"
4. "Audit my .claude folder against the current Anthropic docs."

Should not load:
1. "Fix the failing test in auth.spec.ts."
2. "What is a Claude skill?" (a question, not a setup request)
3. "Write a README for this repo."

Should ask first (phase 0):
1. A fresh audit with phronesis off asks one grouped question (how to ask, how to write) before
   phase 1.
2. With `question_style` and `reply_style` in the lock file, it does not ask.
3. With `~/.claude/.phronesis-always` present, it does not ask and uses the phronesis shape.

## First-run offer (hook: hooks/first-run.mjs)

In a git repository with no `.claude/phronesis.json` and no `.claude/phronesis-lock.json`,
start a new session and send any message:
1. The answer to the message comes first.
2. The last part is one multiple choice question: scan, not now, never for this repository.
3. Nothing was scanned before the answer.
4. After "Yes", the audit runs in scan mode (profile and gates only), `.claude/audit-report.md`
   exists, `.claude/phronesis.json` holds `{"scan":"done"}`, and nothing was installed.
5. After "Never", `.claude/phronesis.json` holds `{"scan":"never"}` and the next session is
   silent. After "Not now", it holds `{"scan":"snoozed","until":"<7 days ahead>"}`, the
   next sessions are silent, and the offer returns once that date has passed.
6. PDFs, `.env` files and data folders such as `local/` were not opened, and the report
   lists them as skipped.
7. Outside a git repository, the offer does not appear.

## The two skills as one

Run the audit on a small repo with phronesis on, and check:
1. The chat reply starts with a verdict in counts, for example "Adopt 3, adapt 1, reject 5."
2. At most five recommendations are shown in chat, and the install plan is numbered single
   steps.
3. `.claude/audit-report.md` exists and holds the full tables.
4. The last line is "Next action (recommended): ...", and nothing was installed.
5. The first line of the chat reply includes the gate status, and missing gates come first in
   the install plan.
6. The report proposes CLAUDE.md cuts, states a cost per piece, and describes a with and
   without baseline on real tasks.
7. The question caps match in `skills/phronesis/SKILL.md` (break rule 4) and phase 0 of
   `skills/claude-setup-audit/SKILL.md`: at most two questions, three options each, and
   "other" always allowed.

## Results

| Date | Prompt | Expected | Loaded | Notes |
|---|---|---|---|---|
