// SessionStart hook for Claude Code: in a git repository that Phronesis has not
// seen yet, ask Claude to offer a read-only scan after it answers the user's first
// message. Silent when the repository has a decision on record, when it is not a
// git repository, or when anything goes wrong. Never blocks session start.
//
// A decision is on record when .claude/phronesis-lock.json exists (the audit has run)
// or .claude/phronesis.json holds "done" or "never", or "snoozed" with an "until" date
// that has not passed yet. "Not now" snoozes the offer for 7 days, so the offer does
// not cost context in every session of a repository the user is not ready to scan.

import fs from "node:fs";
import path from "node:path";

function decided(claudeDir) {
  if (fs.existsSync(path.join(claudeDir, "phronesis-lock.json"))) return true;
  const file = path.join(claudeDir, "phronesis.json");
  if (!fs.existsSync(file)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    if (state.scan === "snoozed") return typeof state.until === "string" && state.until > new Date().toISOString().slice(0, 10);
    return true;
  } catch {
    // An unreadable file still counts as a decision: never nag because of a broken file.
    return true;
  }
}

try {
  const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!fs.existsSync(path.join(project, ".git"))) process.exit(0);
  if (decided(path.join(project, ".claude"))) process.exit(0);

  const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  process.stdout.write(
    [
      "Phronesis first-run offer: this repository has no decision on record.",
      "After answering the user's first message, ask one multiple choice question (AskUserQuestion",
      'if available): "Scan this repo first, read-only, to tune your Claude Code setup?"',
      "Options: Yes (recommended; read-only, nothing installed) / Not now / Never for this repository.",
      "Do not scan before the answer. With the user's permission, write .claude/phronesis.json:",
      `Yes: run the claude-setup-audit skill in scan mode, then {"scan":"done"}. Not now: {"scan":"snoozed","until":"${until}"}.`,
      'Never: {"scan":"never"}. Skip the offer if the first message already asks for the audit.',
      "",
    ].join("\n"),
  );
} catch {
  process.exit(0);
}
