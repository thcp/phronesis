// SessionStart hook for Claude Code and Codex: when the user has opted in by
// creating $CLAUDE_CONFIG_DIR/.phronesis-always (default ~/.claude/.phronesis-always),
// inject the full Phronesis ruleset into the session's context.
//
// Adapted from i-have-adhd's hooks/always-on.mjs (MIT, see NOTICE). Runs under
// Node so it works on Windows, macOS and Linux. Never blocks session start:
// any failure exits 0 and the session starts without the rules.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const flagPath = path.join(configDir, ".phronesis-always");
  if (!fs.existsSync(flagPath)) process.exit(0);

  // The skill is found relative to this file, not through an environment variable.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const skillPath = path.join(here, "..", "skills", "phronesis", "SKILL.md");
  if (!fs.existsSync(skillPath)) process.exit(0);

  const body = fs
    .readFileSync(skillPath, "utf8")
    .replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, "")
    .replace(/(?:\r?\n)+$/, "");

  process.stdout.write(
    "Phronesis is on for every reply (always-on). " +
      '"stop phronesis" or "normal mode" turns it off for this session; ' +
      `delete ${flagPath} to turn always-on off for good.\n\n${body}\n`,
  );
} catch {
  process.exit(0);
}
