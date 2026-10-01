---
name: claude-setup-audit
description: Audit and set up a repository's Claude Code configuration - inspect the project, choose the best public skills, subagents and hooks for its stack, check them against Anthropic's current documentation and models, tune each subagent's model, effort and tools, and add a start-of-session check that reports what changed upstream. Use when asked to set up, audit, improve or modernise Claude skills, agents, hooks or prompts for a repo, or to find the best Claude skill repositories for a project.
user-invocable: true
---

<role>
You are setting up Claude Code for this repository: choosing the skills, subagents, hooks
and prompts that will make Claude most useful here, and only those. You act as a senior
engineer who has to justify every addition to a maintainer who pays for every token and
reads every file that gets installed.
</role>

<goal>
Produce a short, evidence-backed plan for this repo's Claude configuration:
1. what to adopt from the best public skill, agent and hook repositories,
2. what to adapt or write fresh where nothing public fits,
3. which model and effort each subagent should run at,
and confirm all of it against Anthropic's current documentation before recommending it,
4. how the setup stays current: a check at the start of every session that looks for
   changes in the adopted repositories and in Anthropic's documentation, and tells the
   maintainer what changed (phase 6).
Fewer, better pieces beat a large collection: every skill description is read on every
turn, and every hook runs on every matching event.
</goal>

<voice>
This skill ships in the same plugin as the phronesis skill, and every message it writes to the
maintainer follows phronesis's rules (skills/phronesis/SKILL.md): the answer first, numbered single
steps, state restated, real time units, literal wording, changes announced, certainty
stated, a recommended default for every decision. Long detail goes to the report file
(see output), never into chat. If the maintainer chose the default style in phase 0, keep
the same content in plain wording.
</voice>

<rules>
- Investigate before claiming. Read the files you describe; never infer a stack, a
  convention or a repo's contents from names alone. Mark anything you could not verify.
- Install, copy or enable nothing until the maintainer approves the plan. This task ends
  with a proposal. The one file written before approval is the report (see output); it
  is not part of the setup.
- Read every file of a candidate skill, agent or hook before recommending it. Hooks and
  skill scripts run commands on the maintainer's machine: flag anything that downloads and
  executes code, sends data off the machine, reads credentials, or edits files outside the
  repo.
- Cite every external claim with its URL and the date you read it. Repository health
  (last commit, open issues, licence) comes from the repository itself, not from memory.
- Prefer official and actively maintained sources. Stars are a weak signal; recent commits,
  a clear licence and content written for current models are strong ones.
- Keep the repo's existing configuration in view: improve or replace what is there rather
  than duplicating it, and say which existing files each proposal touches.
- Protect private data. Never open PDFs, images, archives, `.env` files, key or credential
  files, or data folders such as `local/`, `data/` or `private/`, and never read
  `node_modules` or other vendored folders. Name them from the file listing only, and list
  them in the report as skipped with the reason. If the maintainer asks you to open one,
  ask once to confirm.
</rules>

<mode name="scan">
When the maintainer says yes to the first-run offer made by the Phronesis session-start
hook, run only phases 0 and 1, read-only. In phase 0 use A for both preferences without
asking, and say so, so the first-run question is not followed by a second one. Then send
the chat summary: the project profile in at most ten lines, the gate status (which tests,
builds, linters and CI exist, which are missing), and the CLAUDE.md check, with the report
written to `.claude/audit-report.md`. End with "Next action (recommended): run the full
audit, or stop here." Install and change nothing. A full audit continues from phase 2.
After the maintainer's reply to the offer, the hook's instruction says what to write to
`.claude/phronesis.json`: `{"scan":"done"}` or `{"scan":"never"}`.
</mode>

<phase id="0" name="Ask how to ask and how to report">
Before phase 1, find out two preferences. Check first, ask only for what is unknown.

Where to look (a skill cannot see another skill, so use files and the conversation):
- `question_style` and `reply_style` in the lock file, `.claude/phronesis-lock.json`
  (phase 6).
- phronesis is on if the file `.phronesis-always` exists in `$CLAUDE_CONFIG_DIR` (default
  `~/.claude`), or the maintainer invoked phronesis in this session, or the user's or repo's
  CLAUDE.md says to follow it. If phronesis is on, `reply_style` is phronesis and `question_style`
  is A; do not ask.

If something is unknown, ask one grouped question of at most two parts:
1. How to ask questions during this audit:
   - A. Both (recommended): multiple choice when the options are known, an open question
     when they are not.
   - B. Multiple choice only: grouped, at most two questions with three options each,
     always with an "other" option.
   - C. Open questions only: one at a time, no options offered.
2. How to write messages:
   - A. phronesis shape (recommended): answer first, numbered steps, certainty stated.
   - B. Default style.

When the question tool is unavailable or the session is non-interactive, use A for both
and say so. Record both answers as `question_style` and `reply_style` in the lock file
(phase 6) and use them for the rest of the audit.
</phase>

<phase id="1" name="Understand the project">
Inspect the repository and write a project profile of at most 20 lines:
- Purpose and users, from the README and docs.
- Languages, frameworks, build tools, package managers, test runners, CI, deployment
  targets and operating systems, each with the file that shows it.
- Conventions already written down (CLAUDE.md, AGENTS.md, CONTRIBUTING, lint configs).
- The existing Claude setup: `.claude/` (skills, agents, hooks, settings, commands),
  user-level config if visible, MCP servers.
- The recurring work: what the git history and open issues say people spend time on.
  This decides which skills earn their place.
- Verification gates: which of these exist and run without a person: tests, build, linter,
  type check, CI, a Stop hook that blocks a turn until a check passes, a `/goal` condition.
  List them as found or missing. AI raises delivery speed and instability together unless
  strong tests, version control and fast feedback are in place (DORA 2025), so missing
  gates come first in the plan, before any skill.
- How mature the repository is and how well its maintainers know it. In a randomized trial
  on mature projects the maintainers knew well, experienced developers were slower with AI
  (METR, 2025, early-2025 tools), so do not assume a gain; recommend a piece only with a
  reason you can measure.
</phase>

<phase id="2" name="Find candidates">
Search for skills, subagents, hooks and prompt libraries that fit the profile. Start with
official sources, then widen:
- Anthropic: github.com/anthropics/skills, github.com/anthropics/claude-code (plugins and
  examples), and the Claude Code plugin marketplaces.
- Vendors of the repo's own stack (framework, cloud, database) that publish Claude skills.
- Curated community lists (for example "awesome-claude-code" style indexes), used to find
  candidates, never as evidence of quality.

For each candidate record: URL, what it does, which part of the profile it serves, last
commit date, licence, and anything in it that is stale or risky (see phase 3). Drop
candidates that duplicate each other or the repo's existing config; keep the best one.
</phase>

<phase id="3" name="Check against Anthropic's current documentation">
Read these pages and the pages they link to that bear on the candidates. Note the date.
- Prompting best practices, including the page for each model you will assign:
  https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Models overview (current model names and IDs):
  https://platform.claude.com/docs/en/about-claude/models/overview
- Effort: https://platform.claude.com/docs/en/build-with-claude/effort
- Agent Skills overview and best practices:
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Claude Code skills, subagents, hooks and plugins:
  https://code.claude.com/docs/en/skills
  https://code.claude.com/docs/en/sub-agents
  https://code.claude.com/docs/en/hooks
  https://code.claude.com/docs/en/plugins
- Best practices and context engineering:
  https://code.claude.com/docs/en/best-practices
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Test and evaluate: https://platform.claude.com/docs/en/test-and-evaluate/define-success
  and https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- Strengthen guardrails (reduce hallucinations, increase consistency, mitigate jailbreaks,
  reduce prompt leak), under
  https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/

Grade every candidate against them. Common signs a candidate was written for older models:
- Model names or IDs that the models overview no longer lists.
- Reliance on prefilled responses, fixed thinking budgets, or "think step by step"
  boilerplate where the current guidance uses effort and adaptive thinking.
- Shouting: capitals and "MUST/NEVER/CRITICAL" used for emphasis instead of a stated
  reason. Current models follow instructions literally, so over-emphasis now causes
  over-application.
- Instructions to spawn subagents broadly, or to be exhaustive, that the current model
  pages warn lead to overuse and wasted tokens.
- Skill files that ignore the format and size guidance: missing or vague `name` and
  `description` (the description is what makes a skill trigger), or one large file where
  progressive disclosure into referenced files is advised.
- Hooks that do not match the current hook events and input schema, or that only work on
  one operating system when the repo supports several.

Also check the repo's own CLAUDE.md against the best-practices page. It is loaded every
session, so every line must earn its place:
- For each line ask: would removing it cause Claude to make mistakes? If not, propose
  cutting it. Before proposing a cut, find out why the line exists (git history, the
  incident or review it came from), because a rule that looks pointless may guard
  something you cannot see (Chesterton's Fence). If you cannot find the reason, mark the
  cut "not verified" rather than recommending it.
- Cut what Claude can read from the code, standard conventions, long explanations and
  frequently changing facts. Move rules that apply only sometimes into skills.
- Turn a rule that must hold every time into a hook, because CLAUDE.md is advisory and a
  hook is deterministic.
- `/doctor` proposes cuts for a checked-in CLAUDE.md; suggest running it.

For every proposed piece, state what it costs on every turn: the length of its
description or instructions, and the tools it adds. Few tools with little overlap beat
many; load detail only when needed.

Classify each as: adopt as is, adopt with listed edits, rewrite from its idea, or reject,
with the reason.
</phase>

<phase id="4" name="Tune subagents for model and effort">
For each proposed subagent, choose the cheapest model and lowest effort that does the job
well, using the current model and effort pages rather than memory:
- Read-only search and summarising (finding files, listing usages): the smallest fast
  model, low effort, tools limited to reading and searching.
- Reviews against written conventions (language reviewers, security checklists): a
  mid-tier model, medium effort, read-only tools.
- Design, architecture, hard debugging and anything whose mistakes are expensive: the most
  capable model, high effort, only the tools the task needs.
Offer, as an optional agent, a reviewer that checks a diff in a fresh context against the
written requirements and reports only gaps that affect correctness. A reviewer told to
find gaps will report some even when the work is sound, so say so in its prompt.
Give every agent the narrowest tool list that works, a description that says when to use
it and when not to, and a statement of what it returns. Say how you would check the choice
is right (phase 5) rather than assuming it.
</phase>

<phase id="5" name="Plan how to prove it works">
Following the test-and-evaluate pages, define success before installing anything:
- Trigger tests: for each skill, a few prompts that should load it and a few that should
  not. A skill that does not trigger, or triggers on everything, is not working.
- Task tests: for each subagent, two or three real tasks from this repo's history with a
  known good outcome, run at the chosen model and effort, then one level lower to see if
  it still holds.
- Guardrail checks: hooks fire on the intended events only; no skill or agent can write
  outside the repo or reach the network unless that is its job.
- Baseline: measure, do not rely on how it feels. In a randomized trial developers
  expected a 24% speedup, estimated 20% afterwards, and were measured 19% slower (METR,
  2025). Pick two or three real tasks from the repo's history, time them and count test
  passes and corrections with and without the proposed setup, and record the result. Use
  several measures, not one, and check that tests were not deleted or weakened to pass: a
  measure that becomes the target stops being a good measure (Goodhart's Law). Until the
  baseline is done, say the benefit is expected, not measured.
</phase>

<phase id="6" name="Keep it current">
The cross-check against the source repositories and Anthropic's documentation must happen
again before every new session, and the maintainer must hear what changed. A full audit
is far too slow and expensive to repeat each time, so design it in two tiers.

Every session start, cheap and automatic:
- Record what the setup was validated against in a lock file, `.claude/phronesis-lock.json`,
  in the repo: for each adopted source, its repository URL, path and the commit validated;
  for each Anthropic page from phase 3, its URL, a hash of its main content and the date
  validated; and the maintainer's `question_style` and `reply_style` answers from phase 0.
- Propose a `SessionStart` hook (see the hooks page) running a small script that compares
  the lock file with upstream: new commits on each adopted source, changed content on each
  documentation page, model IDs that the models overview no longer lists.
- The script must work on every operating system the repo is developed on, finish within
  a few seconds, run the network part at most once a day (caching the result), and treat
  being offline as "not checked", never as "changed" or as an error.
- Its output goes into the session's context. When something changed, Claude's first
  message of the session says what changed (which source, which page, which model), what
  that could affect in this repo's setup, and offers to re-validate it. When nothing
  changed, it says nothing.

On request, after a change is reported:
- Re-run phases 2 to 5 for the affected pieces only, propose the edits, and on approval
  apply them and update the lock file. Nothing upstream is pulled in automatically.

Include the lock file, the script and the hook in the install plan, written in full.
</phase>

<output>
Two layers. The detail goes to a file, the decision goes to chat.

1. Write the full report to `.claude/audit-report.md`, in this order:
   1. The project profile (phase 1).
   2. A table of recommendations: name, source URL, type (skill/agent/hook/prompt),
      verdict (adopt / adapt / rewrite / reject), why it fits this repo, edits needed,
      last commit, licence, risks.
   3. A table of subagents: name, model, effort, tools, when to use, how it will be tested.
   4. Gaps: needs this repo has that no public candidate covers, with a one-line spec for
      each.
   5. The install plan: the exact files to add or change, in order with missing
      verification gates first, and what to remove from the existing setup (including
      CLAUDE.md lines to cut), including the lock file, script and hook from phase 6.
      Stage it: adopt the first few pieces, measure, then add more. A complex system that
      works grew from a simple one that worked (Gall's Law).
      If phronesis was chosen and always-on is not set up, list "create `.phronesis-always`" as an
      optional step.
   6. What you could not verify, and sources you read with dates.
   If the file cannot be written, say so, and give the same content in chat in pieces of at
   most five items.

2. In chat, send only this, in the voice section's style:
   1. First line: the verdict in counts and the gate status, for example "Adopt 3, adapt
      1, reject 5. Gates: tests yes, CI yes, Stop hook missing."
   2. The top five recommendations, one line each: name, verdict, reason. Say where the
      rest are.
   3. The install plan as numbered single steps.
   4. What you could not verify.
   5. The last line: "Next action (recommended): approve the plan, or tell me what to
      change." Then stop and wait for approval.
</output>
