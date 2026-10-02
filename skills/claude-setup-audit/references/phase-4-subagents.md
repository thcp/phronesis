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
