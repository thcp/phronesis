// SessionStart hook for Claude Code: in a git repository that Phronesis has not
// seen yet, ask Claude to offer a read-only scan after it answers the user's first
// message. Silent when the repository has a decision on record, when it is not a
// git repository, or when anything goes wrong. Never blocks session start.
//
// A decision is on record when .claude/phronesis.json exists (the scan was done or
// declined for good) or .claude/phronesis-lock.json exists (the audit has run).
// "Not now" writes nothing, so the offer returns next session.

import fs from "node:fs";
import path from "node:path";

try {
  const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!fs.existsSync(path.join(project, ".git"))) process.exit(0);

  const claudeDir = path.join(project, ".claude");
  if (fs.existsSync(path.join(claudeDir, "phronesis.json"))) process.exit(0);
  if (fs.existsSync(path.join(claudeDir, "phronesis-lock.json"))) process.exit(0);

  process.stdout.write(
    [
      "Phronesis first-run offer. This repository has no Phronesis decision on record.",
      "",
      "In your first reply of this session, answer the user's message first. Then, at the end,",
      "offer a read-only scan of the repository. Ask one multiple choice question, using the",
      "AskUserQuestion tool if it is available, otherwise a lettered list ending with \"other\":",
      "",
      "Question: Scan this repo first, read-only, to tune your Claude Code setup?",
      "- Yes (recommended): read-only scan, nothing is installed.",
      "- Not now: ask again next session.",
      "- Never for this repository.",
      "",
      "Do not scan before the user answers. After the answer:",
      "- Yes: run the claude-setup-audit skill in scan mode (phases 0 and 1 only), then write",
      "  {\"scan\":\"done\"} to .claude/phronesis.json.",
      "- Never: write {\"scan\":\"never\"} to .claude/phronesis.json.",
      "- Not now: write nothing.",
      "Ask permission before writing. During the scan, never open PDFs, .env files, keys or",
      "data folders such as local/; list them as skipped. Offer once per session. If the user's",
      "first message already asks for the audit, skip the offer.",
      "",
    ].join("\n"),
  );
} catch {
  process.exit(0);
}
