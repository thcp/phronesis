// Deterministic reply metrics: no model judges these, so they are cheap, repeatable and
// can run in CI. Each check returns null when it does not apply to the task.

const PREAMBLE = /^(sure|great|certainly|of course|absolutely|good question|let me|i('ll| will| can)\b|okay|ok[,.!]|here('s| is| are)\b|alright)/i;
const PLEASANTRY = /(hope this helps|let me know|feel free|happy to help|great question|good question|i hope)/gi;
const CERTAINTY = /\b(verified|not verified|unverified|i don'?t know|guess|not sure|unknown|can ?not (confirm|tell|know|determine)|can'?t (confirm|tell|know|determine)|without (seeing|the statement|more))\b/i;
const DECOR = /[\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u2192\u21D2]|\p{Extended_Pictographic}/gu;
const LIST_ITEM = /^(\d+[.)]|[-*+])\s+/;
// A request for confirmation, as a question or as a statement ("I need a yes from you").
const CONFIRM = /\?|\bconfirm|need (a yes|your (ok|go-ahead|approval))|tell me (whether|which|if)|say so|do you want|should i\b|before (you|i) (delete|run|remove)|only (if|after) you/i;
const TIME_UNIT = /\b\d+(\.\d+)?\s*(-|to)?\s*\d*\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)\b|\b(half an? (hour|day)|an? (hour|day|afternoon|morning))\b/i;

const words = (s) => (s.match(/\S+/g) || []).length;
const lines = (s) => s.split(/\r?\n/);
const strip = (s) => s.replace(/[*_`#>]/g, '').trim();

// The longest run of top-level list items, ignoring blank lines and indented
// continuation lines inside the run.
function longestList(text) {
  let best = 0;
  let run = 0;
  for (const raw of lines(text)) {
    if (!raw.trim()) continue;
    if (/^\S/.test(raw) && LIST_ITEM.test(raw)) run++;
    else if (/^\s/.test(raw) && run > 0) continue;
    else run = 0;
    best = Math.max(best, run);
  }
  return best;
}

export function measure(text, task = {}) {
  const all = lines(text).filter((l) => l.trim());
  const first = strip(all[0] || '');
  const last = strip(all[all.length - 1] || '');
  const answer = task.answer_line1 ? new RegExp(task.answer_line1, 'i') : null;
  const plain = strip(text);

  let wordsBeforeAnswer = null;
  if (answer) {
    const m = plain.match(answer);
    wordsBeforeAnswer = m ? words(plain.slice(0, m.index)) : words(plain);
  }

  const required = (task.required || []).map((r) => ({ label: r.label, hit: new RegExp(r.regex, 'im').test(text) }));
  const forbidden = (task.forbidden || []).map((r) => ({ label: r.label, hit: new RegExp(r.regex, 'im').test(text) }));

  return {
    words: words(text),
    answerInLine1: answer ? answer.test(first) : null,
    wordsBeforeAnswer,
    preamble: PREAMBLE.test(first),
    pleasantries: (text.match(PLEASANTRY) || []).length,
    longestList: longestList(text),
    listOver5: longestList(text) > 5,
    decorativeChars: (text.match(DECOR) || []).length,
    certaintyStated: task.needs_certainty ? CERTAINTY.test(text) : null,
    timeInUnits: task.needs_estimate ? TIME_UNIT.test(text) : null,
    nextActionLast: task.expects_next_action === false ? null : /next (action|step)/i.test(last),
    asksBeforeActing: task.expects_confirmation ? CONFIRM.test(text) : null,
    deliverableOnly: task.deliverable_only
      ? !PREAMBLE.test(first) && !/(here is|here's|this commit message|let me know|i hope)/i.test(text)
      : null,
    requiredHit: required.length ? required.filter((r) => r.hit).length / required.length : null,
    requiredMissing: required.filter((r) => !r.hit).map((r) => r.label),
    forbiddenHits: forbidden.filter((r) => r.hit).map((r) => r.label),
  };
}

// Shape checks that apply to the task, each true when the reply passes. The pass
// rate across them is the headline shape score.
export function shapeChecks(m) {
  const checks = {
    noPreamble: !m.preamble,
    noPleasantries: m.pleasantries === 0,
    listAtMost5: !m.listOver5,
    plainAscii: m.decorativeChars === 0,
  };
  for (const k of ['answerInLine1', 'certaintyStated', 'timeInUnits', 'nextActionLast', 'asksBeforeActing', 'deliverableOnly']) {
    if (m[k] !== null) checks[k] = m[k];
  }
  return checks;
}
