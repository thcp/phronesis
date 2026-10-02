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

Run `node <skill dir>/scripts/check-setup.mjs <path>` on each candidate's folder as well as on
the repo: it checks the frontmatter limits (name at most 64 characters, lowercase letters,
numbers and hyphens, without the reserved words "anthropic" or "claude"; description non-empty
and at most 1024 characters), the SKILL.md size (under 500 lines), broad permissions and hooks.

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
