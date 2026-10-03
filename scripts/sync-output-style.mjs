#!/usr/bin/env node
// Native Claude style and the hook core share one source of truth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function outputStyle(core) {
  return '---\nname: phronesis\ndescription: Direct, literal replies with complete facts and visible task state.\nkeep-coding-instructions: true\nforce-for-plugin: false\n---\n\n' + core.replace(/^# Phronesis \(always-on core\)/, '# Phronesis').replace(/\r\n/g, '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  fs.writeFileSync(path.join(root, 'output-styles/phronesis.md'), outputStyle(fs.readFileSync(path.join(root, 'skills/phronesis/core.md'), 'utf8')));
}
