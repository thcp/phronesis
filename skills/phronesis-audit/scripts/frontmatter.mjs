import { isMap, parseDocument } from './vendor/yaml.mjs';

// No snippets from potentially private configuration in parser errors.
export function frontmatter(text) {
  if (typeof text !== 'string') return { fields: null, body: '', error: 'unreadable' };
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { fields: null, body: text, error: text.startsWith('---') ? 'unclosed' : null };
  try {
    const doc = parseDocument(match[1], { prettyErrors: false, strict: true, stringKeys: true, uniqueKeys: true, logLevel: 'silent' });
    if (doc.errors.length || doc.warnings.length || !isMap(doc.contents)) throw new Error('unsupported YAML');
    return { fields: doc.toJS({ maxAliasCount: 100 }), body: text.slice(match[0].length), error: null };
  } catch {
    return { fields: null, body: text.slice(match[0].length), error: 'invalid or unsupported YAML mapping' };
  }
}
