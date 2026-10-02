// Phronesis for OpenCode. Adapted from i-have-adhd's OpenCode plugin (MIT, see NOTICE).
//
// skills/phronesis/SKILL.md is the single source of the rules.
//
//   On demand:  registers the skills directory and an `/phronesis` command, so the
//               rules apply for the rest of the session.
//   Always-on:  while ~/.config/opencode/.phronesis-always exists, the always-on
//               core (skills/phronesis/core.md) is appended to the system prompt
//               every turn (the OpenCode equivalent of the SessionStart hook in
//               hooks/always-on.mjs). The full rules stay available through the skill.
//
// Install: add to opencode.json
//   { "plugin": ["/absolute/path/to/phronesis/.opencode/plugins/phronesis.mjs"] }

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../../skills');
const corePath = path.join(skillsDir, 'phronesis', 'core.md');
const commandPath = path.join(__dirname, '..', 'command', 'phronesis.md');

const flagPath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'opencode',
  '.phronesis-always',
);

// JSON is valid YAML frontmatter, so the command metadata needs no YAML parser.
async function commandDefinition() {
  const raw = await fs.promises.readFile(commandPath, 'utf8');
  const match = raw.match(/^---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)([\s\S]*)$/);
  if (!match) throw new Error('Missing command frontmatter');
  return { ...JSON.parse(match[1]), template: match[2].trim() };
}

// The always-on core, trimmed the same way as hooks/always-on.mjs.
function rulesBody() {
  return fs.readFileSync(corePath, 'utf8').replace(/(?:\r?\n)+$/, '');
}

export default async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);

      // Keep a user's own /phronesis command if they defined one.
      try {
        config.command = config.command || {};
        if (!config.command['phronesis']) config.command['phronesis'] = await commandDefinition();
      } catch (e) {
        // A missing or malformed command file must not break skill discovery.
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      let on = false;
      try { on = fs.existsSync(flagPath); } catch (e) {}
      if (!on) return;

      let body;
      try { body = rulesBody(); } catch (e) { return; }

      const injected =
        'Phronesis is on for every reply (always-on). "stop phronesis" or "normal mode" ' +
        'turns it off for this session; delete ' + flagPath +
        ' to turn always-on off for good.\n\n' + body;

      if (output.system.length > 0) {
        output.system[output.system.length - 1] += '\n\n' + injected;
      } else {
        output.system.push(injected);
      }
    },
  };
};
