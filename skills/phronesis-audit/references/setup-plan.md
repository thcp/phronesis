# Reversible Claude setup plans

Use `scripts/setup-plan.mjs` in this skill for repository Claude configuration. It does
not edit application code, global settings, the plugin installation or credentials.
The report can be written before approval; the setup files and commands require approval
for that exact plan. Do not ask again when the maintainer already authorized it.

Write a JSON plan outside the target configuration. Include complete final file contents,
not patches. For existing files, compute SHA-256 over their current UTF-8 contents; use
`null` only when the file does not exist. `content: null` deletes an existing file.

```json
{
  "version": 1,
  "files": [
    {"path": "CLAUDE.md", "beforeSha256": null, "content": "Run the documented checks before committing.\n"}
  ],
  "checks": [
    {"argv": ["node", "scripts/check.mjs"], "timeoutMs": 30000}
  ]
}
```

Preview first. Show the maintainer the exact file contents/diff and command arguments along
with the preview hashes; a hash list alone is not an understandable approval request.

```sh
node <skill-dir>/scripts/setup-plan.mjs <repo> <plan.json>
node <skill-dir>/scripts/setup-plan.mjs <repo> <plan.json> --apply --verify
node <skill-dir>/scripts/setup-plan.mjs <repo> <transaction-id> --rollback
```

Preview is read-only. Apply checks every expected hash before changing any plan file,
uses atomic file replacement, and stores before contents and permissions in a private
journal under `.claude/phronesis-state/transactions/`. Keep that directory out of git.
Reapplying identical contents is a no-op; with `--verify`, checks still run.
Checks run without a shell, in the repository, only with `--apply --verify`. They can
still have side effects: review their arguments and repository scripts first. Exit code
0 proves only that the command exited successfully, not that Claude loaded the file or
that test coverage is sufficient. The utility does not save command output.

Failed verification restores the plan's files. Rollback preflights every file and refuses
to overwrite later maintainer edits. Journal files retain before contents, so treat them
as private configuration. Created directories and command side effects are not removed.
There is no multi-file atomicity or protection against unrelated processes racing writes.
The apply lock serializes this utility's writers; a terminated process may leave
`apply.lock`. Confirm no apply is running before removing a stale lock, then roll back
its pending transaction. A conflict needs manual review, not a force flag.

Allowed targets are root `CLAUDE.md`, root `CLAUDE.local.md` and files beneath `.claude/`.
Absolute paths, traversal, symlink parents, key files, `.env`, `.git`, overlapping targets
and reserved transaction state are rejected. Never place secrets in a plan. Build/lint/test
changes outside these paths belong in a separate reviewed code change.
