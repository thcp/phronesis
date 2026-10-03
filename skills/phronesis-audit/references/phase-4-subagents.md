<phase id="4" name="Tune subagents for model and effort">
For each proposed subagent, choose the model and effort from the current effort page, read
today (https://platform.claude.com/docs/en/build-with-claude/effort), not from memory. Defaults
differ by model, so do not copy a fixed table. Mark each rule below as Anthropic (from that
page) or Ours (this skill's own choice), and keep the mark in the proposal.
Proposing no subagent is a valid result: if the repo has no recurring work that a separate
context would do better, say so and propose none, because every agent description is read on
every turn.
Name the model with its ID from the models overview, read today
(https://platform.claude.com/docs/en/about-claude/models/overview), and say so. If you did not
read that page, label the model "not verified" and do not present "mid-tier" or "most capable"
as a model name.
- Code work (writing, refactoring, reviewing code): effort medium at the lowest, never low,
  because code quality comes first (Ours). Medium for well-specified tasks; high for hard or
  long ones (Anthropic: medium for well-specified agentic coding, high for harder or longer
  work). xhigh or max only where an eval shows a gain (Anthropic).
- Reviews against written conventions (language reviewers, security checklists): a mid-tier
  model, medium effort, read-only tools (Ours).
- Design, architecture, hard debugging and anything whose mistakes are expensive: the most
  capable model, high effort, only the tools the task needs (Ours).
- Read-only search and summarising (finding files, listing usages): low effort, tools limited
  to reading and searching (Anthropic: low suits simple tasks and subagents).
- Coordination and orchestration (splitting work, collecting results): low or medium effort on
  the same model as the main thread, because a smaller model cost 55% more in extra turns in
  our benchmark (Ours, measured). Anthropic gives no rule for this; say so.
Tell the user to run an effort sweep on their own tasks when the model changes, because
Anthropic says settings do not carry over between models.
Offer, as an optional agent, a reviewer that checks a diff in a fresh context against the
written requirements and reports only gaps that affect correctness. A reviewer told to
find gaps will report some even when the work is sound, so say so in its prompt.
Give every agent the narrowest tool list that works, a description that says when to use
it and when not to, and a statement of what it returns. Say how you would check the choice
is right (phase 5) rather than assuming it.
</phase>
