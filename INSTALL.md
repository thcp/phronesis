# Install Phronesis

The commands below use the repository `thcp/phronesis`. Each agent reads the
same `skills/phronesis/SKILL.md`, so the rules are identical everywhere.

## What is tested

"Installs" means: installed from a local clone of this repository into an empty home folder,
and the agent then listed both skills. No model was called, so replies on these agents are not
tested; only Claude Code replies are measured (see `bench/results/`). Checked on 2026-10-03.

| Agent | Status | What was checked |
|---|---|---|
| Claude Code 2.1 | Tested | `claude plugin validate`, always-on hook tests in CI, replies benchmarked |
| Codex CLI 0.160 | Installs | `codex plugin marketplace add`, `codex plugin add`; both skills in the plugin cache |
| Gemini CLI 0.62 | Installs | `gemini extensions install`; `GEMINI.md` and both skills listed |
| Qwen Code 0.24 | Installs | `qwen extensions install`; both skills listed (it first asks which plugin to install) |
| OpenCode 1.18 | Installs | plugin loads; both skills and `/phronesis` registered; always-on not checked in a session |
| `npx skills` | Installs | both skills copied into `.agents/skills/`; whether Cursor or Amp then loads them is not checked |
| Kimi Code CLI | Not tested | install runs inside a logged-in session |
| Antigravity | Not tested | no CLI available to the test |

The routes follow the formats used by [i-have-adhd](https://github.com/ayghri/i-have-adhd).

## Claude Code

```
claude plugin marketplace add thcp/phronesis
claude plugin install phronesis@phronesis
```

Type `/phronesis:phronesis`. The rules stay on until "stop phronesis" or "normal mode".

Always-on, in every session: create the flag file (needs Node on the PATH). Sessions then
start with the compact core of the rules (`skills/phronesis/core.md`, about 900 tokens) and
each prompt gets a one-line reminder; the full rules load when the skill is invoked.

```
touch ~/.claude/.phronesis-always          # macOS, Linux, Git Bash
New-Item ~\.claude\.phronesis-always       # PowerShell
```

Delete the file to turn it off. Without Node, add this line to `~/.claude/CLAUDE.md`
instead: "Follow the phronesis skill on every reply."

The same plugin also holds `phronesis-audit`, a Claude Code setup audit that writes in
the same shape. Type `/phronesis:phronesis-audit`. No second install is needed. Other agents
also see this skill, but it targets Claude Code only.

## Codex

```
codex plugin marketplace add thcp/phronesis --ref main
codex plugin add phronesis@phronesis
```

Type `$phronesis`. Codex does not load it on its own. For always-on, add to `~/.codex/AGENTS.md`:
"Follow the phronesis skill on every reply."

## OpenCode

```
git clone https://github.com/thcp/phronesis ~/.config/opencode/vendor/phronesis
```

Add to `~/.config/opencode/opencode.json`:

```json
{ "plugin": ["/absolute/path/to/.config/opencode/vendor/phronesis/.opencode/plugins/phronesis.mjs"] }
```

Type `/phronesis` in a new session. Always-on: `touch ~/.config/opencode/.phronesis-always`; delete
it to turn it off. Update with `git -C ~/.config/opencode/vendor/phronesis pull`.

## Gemini CLI

```
gemini extensions install https://github.com/thcp/phronesis
```

The extension loads `GEMINI.md`, which imports the skill, so it is on from the first message.
Remove it with `gemini extensions uninstall phronesis`.

## Qwen Code

```
qwen extensions install thcp/phronesis
```

Type `/phronesis`. Check with `/skills` in a new session.

## Kimi Code CLI

In a session: `/plugins`, choose **Custom**, paste
`https://github.com/thcp/phronesis`, then **Trust and install**. Invoke with
`/skill:phronesis`.

## Antigravity

```
agy plugin install https://github.com/thcp/phronesis
```

## Cursor, Amp and other agent-skills tools

```
npx skills add thcp/phronesis                 # this workspace
npx skills add thcp/phronesis -g              # all projects
npx skills add thcp/phronesis -a cursor -y    # one agent
```

Or copy `skills/phronesis/` into the folder your agent scans, for example `~/.cursor/skills/`.
