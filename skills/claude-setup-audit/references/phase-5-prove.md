<phase id="5" name="Plan how to prove it works">
Following the test-and-evaluate pages, define success before installing anything:
- Trigger tests: for each skill, a few prompts that should load it and a few that should
  not. A skill that does not trigger, or triggers on everything, is not working.
- Task tests: for each subagent, two or three real tasks from this repo's history with a
  known good outcome, run at the chosen model and effort, then one level lower to see if
  it still holds.
- Guardrail checks: hooks fire on the intended events only; no skill or agent can write
  outside the repo or reach the network unless that is its job.
- Load check after install: in a fresh subagent with no conversation history, give one prompt
  that should trigger each new skill or rule and one that would violate it, and confirm the
  installed file is what governs the answer. A file that is installed but never loads is not
  part of the setup.
- Real cost: `check-setup.mjs --usage` reads this project's session logs (token counts and tool
  names only) to show which skills are actually invoked and the mean input tokens per session.
  Run it before and after, and propose removing skills that are never invoked.
- Baseline: measure, do not rely on how it feels. In a randomized trial developers
  expected a 24% speedup, estimated 20% afterwards, and were measured 19% slower (METR,
  2025). Pick two or three real tasks from the repo's history, time them and count test
  passes and corrections with and without the proposed setup, and record the result. Use
  several measures, not one, and check that tests were not deleted or weakened to pass: a
  measure that becomes the target stops being a good measure (Goodhart's Law). Until the
  baseline is done, say the benefit is expected, not measured.
</phase>
