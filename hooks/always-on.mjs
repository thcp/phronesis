// SessionStart hook for Claude Code and Codex: when the user has opted in by
// creating $CLAUDE_CONFIG_DIR/.phronesis-always (default ~/.claude/.phronesis-always),
// inject the Phronesis always-on core (skills/phronesis/core.md) into the session's
// context. The core is about a quarter of the full SKILL.md; the full rules stay
// available on demand through the skill.
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

  // The core is found relative to this file, not through an environment variable.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const corePath = path.join(here, "..", "skills", "phronesis", "core.md");
  if (!fs.existsSync(corePath)) process.exit(0);

  const body = fs.readFileSync(corePath, "utf8").replace(/(?:\r?\n)+$/, "");

  process.stdout.write(
    "Phronesis is on for every reply (always-on). " +
      '"stop phronesis" or "normal mode" turns it off for this session; ' +
      `delete ${flagPath} to turn always-on off for good.\n\n${body}\n`,
  );
} catch {
  process.exit(0);
}
