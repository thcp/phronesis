// UserPromptSubmit hook for Claude Code: while always-on is enabled, add a one-line
// reminder next to every prompt, because a style set once at session start fades over
// a long session. About 40 tokens per turn. Silent when always-on is off, and never
// blocks the prompt: any failure exits 0.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

try {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  if (!fs.existsSync(path.join(configDir, ".phronesis-always"))) process.exit(0);

  process.stdout.write(
    "Phronesis reminder: answer first, numbered single steps, literal wording, exact facts, " +
      'certainty stated, next action last. Skip this if the reader said "stop phronesis" or ' +
      '"normal mode" in this session.\n',
  );
} catch {
  process.exit(0);
}
