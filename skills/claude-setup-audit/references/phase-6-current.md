<phase id="6" name="Keep it current">
The cross-check against the source repositories and Anthropic's documentation must happen again
before every new session, and the maintainer must hear what changed. A full audit is far too
slow and expensive to repeat each time, so it runs in two tiers.

Every session start, cheap and automatic:
- Record what the setup was validated against in `.claude/phronesis-lock.json`:

  ```json
  {
    "version": 1,
    "validated": "YYYY-MM-DD",
    "question_style": "A",
    "reply_style": "phronesis",
    "sources": [{ "repo": "owner/name", "path": "skills/x", "commit": "<sha>" }],
    "docs": [{ "url": "https://...", "sha256": "<hash>", "date": "YYYY-MM-DD" }],
    "models": ["<every model ID the setup assigns>"],
    "decisions": [{ "item": "<recommendation name>", "status": "applied | declined | seen", "date": "YYYY-MM-DD" }]
  }
  ```

  Compute each `docs[].sha256` with `node <skill dir>/scripts/drift-check.mjs --hash <url>`,
  so the hash is made the same way the check makes it.
- Install the bundled, tested script rather than writing one: copy
  `<skill dir>/scripts/drift-check.mjs` to `.claude/hooks/phronesis-drift-check.mjs` and add a
  `SessionStart` hook (matcher `startup`) that runs `node .claude/hooks/phronesis-drift-check.mjs`.
  It needs Node 18 or newer and no packages. It works on Windows, macOS and Linux, runs the
  network part at most once a day (cache in `.claude/.phronesis-drift-cache.json`, which
  belongs in `.gitignore`), gives each request 4 seconds, treats being offline as "not
  checked", and prints nothing when nothing changed.
- When it reports a change, Claude's first message of the session says what changed (which
  source, which page, which model), what that could affect in this repo's setup, and offers to
  re-validate it.

On request, after a change is reported:
- Re-run phases 2 to 5 for the affected pieces only, propose the edits, and on approval apply
  them and update the lock file, including `decisions`. Nothing upstream is pulled in
  automatically.

Include the lock file, the copied script and the hook in the install plan, written in full.
</phase>
