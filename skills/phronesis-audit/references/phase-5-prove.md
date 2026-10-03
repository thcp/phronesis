<phase id="5" name="Plan how to prove it works">
Following the test-and-evaluate pages, define success before installing anything:
- Trigger tests: for each skill, a few prompts that should load it and a few that should
  not. A skill that does not trigger, or triggers on everything, is not working.
- Task tests: for each subagent, two or three real tasks from this repo's history with a
  known good outcome, run at the chosen model and effort, then one level lower to see if
  it still holds. For code work, do not test below medium: start at the chosen level and test
  one level higher only if the result is wrong.
- Guardrail checks: hooks fire on the intended events only; no skill or agent can write
  outside the repo or reach the network unless that is its job.
- Load check after install: in a fresh subagent with no conversation history, give one prompt
  that should trigger each new skill or rule and one that would violate it, and confirm the
  installed file is what governs the answer. A file that is installed but never loads is not
  part of the setup.
- Real cost: `check-setup.mjs --usage` reads this project's session logs (token counts and tool
  names only) to show logged input, cache and output totals, peak context and skill calls.
  Duplicate message IDs are consolidated; subagent logs are excluded. This is not billing
  data or proof that an unused skill is unnecessary. Compare like-for-like tasks before and
  after; use explicit pricing and provider billing if a cost estimate is needed.
- Reversible install: use the bundled setup-plan utility for repository Claude files, with
  expected before hashes. Preview the plan, obtain approval for the exact files and commands,
  apply and run the approved checks. Report exit codes separately from whether files loaded.
  Roll back setup files on failed checks; command side effects need separate recovery.
- Baseline: measure, do not rely on how it feels. In a randomized trial developers
  expected a 24% speedup, estimated 20% afterwards, and were measured 19% slower (METR,
  2025). Pick two or three real tasks from the repo's history, time them and count test
  passes and corrections with and without the proposed setup, and record the result. Use
  several measures, not one, and check that tests were not deleted or weakened to pass: a
  measure that becomes the target stops being a good measure (Goodhart's Law). Until the
  baseline is done, say the benefit is expected, not measured.
</phase>
