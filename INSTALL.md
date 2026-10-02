# Install Phronesis

The commands below use the repository `thcp/phronesis`. Each agent reads the
same `skills/phronesis/SKILL.md`, so the rules are identical everywhere.

Tested on Claude Code (manifest validation, the always-on hook) and OpenCode (the plugin
module, run outside OpenCode). The other routes follow the formats used by
[i-have-adhd](https://github.com/ayghri/i-have-adhd), which tests them in CI, and have not
been run against this repository yet.

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

The same plugin also holds `claude-setup-audit`, a Claude Code setup audit that writes in
the same shape. Type `/phronesis:claude-setup-audit`. No second install is needed. Other agents
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
