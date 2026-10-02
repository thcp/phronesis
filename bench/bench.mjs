#!/usr/bin/env node
// Phronesis benchmark. See bench/README.md.
//
//   node bench/bench.mjs replies  --suite S --out O --workspace W --arm A [--arm B] [--trials 3]
//   node bench/bench.mjs judge    --suite S --out O --workspace W
//   node bench/bench.mjs triggers --out O --arm A [--trials 1]
//   node bench/bench.mjs audit    --suite S --out O --repo R --arm A [--trials 2]
//   node bench/bench.mjs rescore  --suite S --out O
//   node bench/bench.mjs report   --suite S --out O [--arms a,b,c] [--gate base,candidate]
//
// Every command is resumable: a result file that already exists is not run again.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArm, hookContext } from './lib/arms.mjs';
import { runClaude, parseJsonResult, parseStream, pool } from './lib/claude.mjs';
import { measure, shapeChecks } from './lib/metrics.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);

function args(argv) {
  const out = { arm: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (key === 'arm') out.arm.push(val);
    else out[key] = val;
  }
  return out;
}

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// --tasks a,b limits a run to those task ids (useful for a smoke test).
const loadTasks = (o) => readJson(path.join(o.suite, 'tasks.json')).filter((t) => !o.tasks || o.tasks.split(',').includes(t.id));
const writeJson = (f, d) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  // Write to a temporary file and rename, so an interrupted run never leaves a half file.
  fs.writeFileSync(`${f}.tmp`, JSON.stringify(d, null, 2));
  fs.renameSync(`${f}.tmp`, f);
};
const log = (...m) => console.error(new Date().toISOString().slice(11, 19), ...m);

// ---------------------------------------------------------------- replies

async function replies(o) {
  const tasks = loadTasks(o);
  const workDir = path.join(o.out, 'work');
  const arms = o.arm.map((s) => parseArm(s, workDir));
  const trials = Number(o.trials || 3);
  const jobs = [];
  for (const arm of arms) for (const task of tasks) for (let t = 1; t <= trials; t++) jobs.push({ arm, task, t });

  await pool(jobs, Number(o.concurrency || 4), async ({ arm, task, t }) => {
    const file = path.join(o.out, 'raw', 'replies', arm.name, `${task.id}__${t}.json`);
    if (fs.existsSync(file)) return;
    const session = hookContext(arm, 'SessionStart', {});
    const turn = hookContext(arm, 'UserPromptSubmit', { prompt: task.prompt });
    const extra = [];
    if (session) {
      const f = path.join(workDir, 'inject', `${arm.name}.txt`);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, session);
      extra.push('--append-system-prompt-file', f);
    }
    // UserPromptSubmit context arrives next to the prompt, as Claude Code adds it.
    const input = turn ? `${task.prompt}\n\n<system-reminder>\n${turn}\n</system-reminder>` : task.prompt;
    const res = await runClaude({
      args: ['--output-format', 'json', '--tools', 'Read,Grep,Glob', ...extra],
      input,
      cwd: o.workspace,
    });
    const parsed = res.ok ? parseJsonResult(res.stdout) : null;
    if (!parsed) {
      log('FAILED', arm.name, task.id, t, res.error || res.stderr);
      return;
    }
    const metrics = measure(parsed.text, task);
    writeJson(file, {
      arm: arm.name,
      source: arm.source,
      task: task.id,
      category: task.category,
      trial: t,
      injectedChars: session.length + turn.length,
      ...parsed,
      wallMs: res.wallMs,
      metrics,
      shape: shapeChecks(metrics),
    });
    log('done', arm.name, task.id, t, `${parsed.outputTokens} out`);
  });
}

// ---------------------------------------------------------------- judge

const JUDGE_RUBRIC = `You grade replies from a coding assistant. Every reply answers the same question about
the codebase in your working directory. A short reference answer, written by someone who checked
the code, is given; it is not exhaustive. You can read the code: check every specific claim a
reply makes (file names, line numbers, function names, behaviour) against it. Grade each reply on
its own; the labels are random and say nothing about where a reply came from.

For each reply give:
- correctness, 1 to 5: is the main answer right? 5 means right and every checked claim holds; 1
  means the main answer is wrong. A reply that accepts a false premise in the question gets at most 2.
- false_claims: how many claims, stated as certain, are wrong according to the code. A true claim
  that the reference does not mention is not false. A claim marked as unverified or a guess does
  not count.
- usefulness, 1 to 5: how well the reader can act on it.
- clarity, 1 to 5: for a reader who is autistic and has ADHD: the answer comes first, wording is
  literal and unambiguous, it is easy to scan. Length is not a virtue.

Return only JSON, no prose and no code fence:
{"A": {"correctness": n, "false_claims": n, "usefulness": n, "clarity": n, "note": "under 15 words"}, ...}`;

// Deterministic shuffle so a re-run labels the same replies the same way.
function shuffled(list, seed) {
  const a = [...list];
  let s = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function judge(o) {
  const tasks = loadTasks(o);
  const root = path.join(o.out, 'raw', 'replies');
  const arms = fs.readdirSync(root).filter((d) => !o.arms || o.arms.split(',').includes(d)).sort();
  const tag = arms.join('+');
  const jobs = [];
  for (const task of tasks) {
    const trials = new Set();
    for (const arm of arms) {
      for (const f of fs.readdirSync(path.join(root, arm))) if (f.startsWith(`${task.id}__`)) trials.add(f.split('__')[1]);
    }
    for (const t of trials) jobs.push({ task, t: t.replace('.json', '') });
  }

  await pool(jobs, Number(o.concurrency || 4), async ({ task, t }) => {
    const file = path.join(o.out, 'raw', 'judge', tag, `${task.id}__${t}.json`);
    if (fs.existsSync(file)) return;
    const replies = arms
      .map((arm) => ({ arm, f: path.join(root, arm, `${task.id}__${t}.json`) }))
      .filter((r) => fs.existsSync(r.f))
      .map((r) => ({ arm: r.arm, text: readJson(r.f).text }));
    const order = shuffled(replies, `${task.id}${t}`);
    const labels = Object.fromEntries(order.map((r, i) => [String.fromCharCode(65 + i), r.arm]));
    const body = order.map((r, i) => `<reply id="${String.fromCharCode(65 + i)}">\n${r.text}\n</reply>`).join('\n\n');
    const input = `${JUDGE_RUBRIC}\n\n<question>\n${task.prompt}\n</question>\n\n<reference>\n${task.reference}\n</reference>\n\n${body}`;
    // The judge reads the code (read-only) to check claims; it never sees which arm wrote what.
    const res = await runClaude({ args: ['--output-format', 'json', '--tools', 'Read,Grep,Glob'], input, cwd: o.workspace });
    const parsed = res.ok ? parseJsonResult(res.stdout) : null;
    let scores = null;
    try {
      scores = JSON.parse(parsed.text.slice(parsed.text.indexOf('{'), parsed.text.lastIndexOf('}') + 1));
    } catch {
      log('JUDGE PARSE FAILED', task.id, t);
      return;
    }
    const byArm = Object.fromEntries(Object.entries(scores).map(([label, s]) => [labels[label], s]));
    writeJson(file, { task: task.id, trial: t, labels, byArm, judgeCostUsd: parsed.costUsd });
    log('judged', task.id, t);
  });
}

// ---------------------------------------------------------------- triggers

async function triggers(o) {
  const cases = readJson(path.join(HERE, 'triggers.json'));
  const workDir = path.join(o.out, 'work');
  const arms = o.arm.map((s) => parseArm(s, workDir)).filter((a) => a.dir);
  const trials = Number(o.trials || 1);
  const jobs = [];
  for (const arm of arms) for (const c of cases) for (let t = 1; t <= trials; t++) jobs.push({ arm, c, t });
  const neutral = fs.mkdtempSync(path.join(os.tmpdir(), 'phr-trig-'));

  await pool(jobs, Number(o.concurrency || 4), async ({ arm, c, t }) => {
    const file = path.join(o.out, 'raw', 'triggers', arm.name, `${c.id}__${t}.json`);
    if (fs.existsSync(file)) return;
    const res = await runClaude({
      args: ['--plugin-dir', arm.dir, '--output-format', 'stream-json', '--verbose', '--tools', 'Skill,Read', '--max-turns', '3'],
      input: c.prompt,
      cwd: neutral,
    });
    const { toolCalls, result } = parseStream(res.stdout || '');
    const loaded = toolCalls.some((tc) => tc.name === 'Skill' && String(tc.input?.skill || '').includes(c.skill));
    writeJson(file, { arm: arm.name, case: c.id, skill: c.skill, expect: c.expect, loaded, costUsd: result?.total_cost_usd ?? null });
    log('trigger', arm.name, c.id, loaded === c.expect ? 'ok' : 'MISS');
  });
}

// ---------------------------------------------------------------- audit

async function audit(o) {
  const spec = readJson(path.join(o.suite, 'audit.json'));
  const workDir = path.join(o.out, 'work');
  const arms = o.arm.map((s) => parseArm(s, workDir)).filter((a) => a.dir);
  const trials = Number(o.trials || 2);
  const jobs = [];
  for (const arm of arms) for (let t = 1; t <= trials; t++) jobs.push({ arm, t });
  const privateRe = new RegExp(spec.private_paths, 'i');

  await pool(jobs, Number(o.concurrency || 2), async ({ arm, t }) => {
    const file = path.join(o.out, 'raw', 'audit', arm.name, `${t}.json`);
    if (fs.existsSync(file)) return;
    // A fresh clone per run: tracked files only, so untracked secrets such as .env never exist in it.
    const ws = path.join(workDir, 'audit-ws', `${arm.name}-${t}`);
    fs.rmSync(ws, { recursive: true, force: true });
    spawnSync('git', ['clone', '--quiet', '--local', '--no-hardlinks', o.repo, ws]);
    const res = await runClaude({
      args: [
        '--plugin-dir', arm.dir, '--output-format', 'stream-json', '--verbose',
        '--tools', 'Skill,Read,Grep,Glob,Bash,Write',
        '--allowedTools', 'Bash(git log:*)', 'Bash(git ls-files:*)', 'Bash(git status:*)', 'Bash(ls:*)', 'Bash(wc:*)', 'Write(.claude/**)',
        '--permission-mode', 'acceptEdits', '--max-turns', '60',
      ],
      input: spec.prompt,
      cwd: ws,
      timeoutMs: 1200000,
    });
    const { toolCalls, result } = parseStream(res.stdout || '');
    const touched = toolCalls.map((tc) => tc.input?.file_path || tc.input?.path || tc.input?.pattern || tc.input?.command || '').map(String);
    const reportFile = path.join(ws, '.claude', 'audit-report.md');
    const out = {
      arm: arm.name,
      trial: t,
      privateOpened: toolCalls
        .filter((tc) => tc.name === 'Read' && privateRe.test(String(tc.input?.file_path || '')))
        .map((tc) => path.relative(ws, tc.input.file_path)),
      toolCalls: toolCalls.length,
      wroteOutsideReport: toolCalls.filter((tc) => tc.name === 'Write' && !String(tc.input?.file_path || '').startsWith(path.join(ws, '.claude'))).length,
      reportWritten: fs.existsSync(reportFile),
      // Headless runs cannot write inside .claude/ (a protected path); the skill then gives
      // the report in chat, which its output section allows.
      reportInChat: !fs.existsSync(reportFile) && ((result?.result || '').match(/\S+/g) || []).length > 150,
      report: fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : '',
      chat: result?.result ?? '',
      durationMs: result?.duration_ms ?? null,
      costUsd: result?.total_cost_usd ?? null,
      inputTokens: result?.usage ? (result.usage.input_tokens || 0) + (result.usage.cache_creation_input_tokens || 0) + (result.usage.cache_read_input_tokens || 0) : null,
      outputTokens: result?.usage?.output_tokens ?? null,
      touched: touched.length,
    };
    // Gate accuracy: a model compares the report with the known gates.
    const gi = `Below is an audit report about a repository and the true state of its verification gates.
For each gate, decide whether the report states it correctly (found vs missing). A gate the
report does not mention counts as wrong. Return only JSON: {"correct": n, "of": n, "wrong": ["gate", ...]}

<truth>
${JSON.stringify(spec.gates, null, 1)}
</truth>

<report>
${out.report}

${out.chat}
</report>`;
    const g = await runClaude({ args: ['--output-format', 'json', '--tools', ''], input: gi, cwd: os.tmpdir() });
    try {
      out.gates = JSON.parse(parseJsonResult(g.stdout).text.replace(/^```(json)?\s*|\s*```$/g, ''));
    } catch {
      out.gates = null;
    }
    writeJson(file, out);
    log('audit', arm.name, t, `private opened: ${out.privateOpened.length}`, `gates: ${out.gates?.correct}/${out.gates?.of}`);
  });
}

// ---------------------------------------------------------------- rescore

// Recomputes the deterministic metrics of every saved reply from its text, with the
// suite's current task definitions, so all arms are scored by the same rules.
function rescore(o) {
  const tasks = Object.fromEntries(loadTasks(o).map((t) => [t.id, t]));
  const root = path.join(o.out, 'raw', 'replies');
  let n = 0;
  for (const arm of listDir(root)) {
    for (const f of listDir(path.join(root, arm))) {
      const file = path.join(root, arm, f);
      const r = readJson(file);
      if (!tasks[r.task]) continue;
      r.metrics = measure(r.text, tasks[r.task]);
      r.shape = shapeChecks(r.metrics);
      writeJson(file, r);
      n++;
    }
  }
  log(`rescored ${n} replies`);
}

// ---------------------------------------------------------------- report

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sd = (xs) => {
  const m = mean(xs);
  return xs.length > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : null;
};
const nums = (xs) => xs.filter((x) => typeof x === 'number' && !Number.isNaN(x));
const fmt = (x, d = 2) => (x === null || x === undefined ? '-' : Number(x).toFixed(d));
const pct = (x) => (x === null ? '-' : `${Math.round(x * 100)}%`);
const rate = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined);
  return v.length ? v.filter(Boolean).length / v.length : null;
};
const listDir = (d) => (fs.existsSync(d) ? fs.readdirSync(d) : []);

function report(o) {
  const tasks = readJson(path.join(o.suite, 'tasks.json'));
  const root = path.join(o.out, 'raw');
  const arms = o.arms ? o.arms.split(',') : listDir(path.join(root, 'replies')).sort();
  const rows = {};
  for (const arm of arms) {
    rows[arm] = listDir(path.join(root, 'replies', arm)).map((f) => readJson(path.join(root, 'replies', arm, f)));
  }
  // Use the judge run that covers the most arms.
  const judgeDirs = listDir(path.join(root, 'judge')).sort((a, b) => b.split('+').length - a.split('+').length);
  const judged = judgeDirs.length ? listDir(path.join(root, 'judge', judgeDirs[0])).map((f) => readJson(path.join(root, 'judge', judgeDirs[0], f))) : [];
  const j = (arm, k) => nums(judged.map((x) => x.byArm?.[arm]?.[k]));

  const L = [];
  L.push(`# Phronesis benchmark`, '', `Generated ${new Date().toISOString().slice(0, 10)}. Suite: ${tasks.length} tasks. Arms: ${arms.join(', ')}.`, '');
  L.push('## Precision', '', `| Metric | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---').join('|')}|`);
  const row = (label, f) => L.push(`| ${label} | ${arms.map((a) => f(a)).join(' | ')} |`);
  row('Required facts present', (a) => pct(mean(nums(rows[a].map((r) => r.metrics.requiredHit)))));
  row('Replies with a forbidden claim', (a) => pct(rate(rows[a].map((r) => r.metrics.forbiddenHits.length > 0))));
  row('Judge: correctness (1-5)', (a) => `${fmt(mean(j(a, 'correctness')))} (sd ${fmt(sd(j(a, 'correctness')))})`);
  row('Judge: false claims per reply (checked against code)', (a) => fmt(mean(j(a, 'false_claims'))));
  row('Judge: usefulness (1-5)', (a) => fmt(mean(j(a, 'usefulness'))));
  row('Judge: clarity for ADHD/autistic reader (1-5)', (a) => fmt(mean(j(a, 'clarity'))));

  L.push('', '## Shape (pass rate of the checks that apply)', '', `| Check | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---').join('|')}|`);
  row('All shape checks', (a) => pct(mean(rows[a].map((r) => rate(Object.values(r.shape))))));
  for (const k of ['answerInLine1', 'noPreamble', 'noPleasantries', 'listAtMost5', 'plainAscii', 'certaintyStated', 'timeInUnits', 'nextActionLast', 'asksBeforeActing', 'deliverableOnly']) {
    row(k, (a) => pct(rate(rows[a].map((r) => r.shape[k]))));
  }
  row('Words before the answer (mean)', (a) => fmt(mean(nums(rows[a].map((r) => r.metrics.wordsBeforeAnswer))), 1));

  L.push('', '## Cost and speed (mean per reply)', '', `| Metric | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---').join('|')}|`);
  row('Words', (a) => `${fmt(mean(rows[a].map((r) => r.metrics.words)), 0)} (sd ${fmt(sd(rows[a].map((r) => r.metrics.words)), 0)})`);
  row('Output tokens', (a) => fmt(mean(nums(rows[a].map((r) => r.outputTokens))), 0));
  row('Input tokens', (a) => fmt(mean(nums(rows[a].map((r) => r.inputTokens))), 0));
  row('Injected context (chars)', (a) => fmt(mean(rows[a].map((r) => r.injectedChars)), 0));
  row('Latency (s)', (a) => fmt(mean(nums(rows[a].map((r) => r.durationMs))) / 1000, 1));
  row('Cost (USD)', (a) => fmt(mean(nums(rows[a].map((r) => r.costUsd))), 4));
  row('Tool turns', (a) => fmt(mean(nums(rows[a].map((r) => r.turns))), 1));

  L.push('', '## Per category: required facts / judge correctness', '', `| Category | ${arms.join(' | ')} |`, `|---|${arms.map(() => '---').join('|')}|`);
  for (const cat of [...new Set(tasks.map((t) => t.category))]) {
    const ids = new Set(tasks.filter((t) => t.category === cat).map((t) => t.id));
    row(cat, (a) => {
      const rf = mean(nums(rows[a].filter((r) => ids.has(r.task)).map((r) => r.metrics.requiredHit)));
      const jc = mean(nums(judged.filter((x) => ids.has(x.task)).map((x) => x.byArm?.[a]?.correctness)));
      return `${pct(rf)} / ${fmt(jc, 1)}`;
    });
  }

  const tArms = listDir(path.join(root, 'triggers')).sort();
  if (tArms.length) {
    L.push('', '## Skill triggering', '', '| Arm | Skill | Should load: loaded (recall) | Should not load: stayed out | Precision |', '|---|---|---|---|---|');
    for (const arm of tArms) {
      const rs = listDir(path.join(root, 'triggers', arm)).map((f) => readJson(path.join(root, 'triggers', arm, f)));
      for (const skill of [...new Set(rs.map((r) => r.skill))]) {
        const s = rs.filter((r) => r.skill === skill);
        const pos = s.filter((r) => r.expect);
        const neg = s.filter((r) => !r.expect);
        const tp = pos.filter((r) => r.loaded).length;
        const fp = neg.filter((r) => r.loaded).length;
        L.push(`| ${arm} | ${skill} | ${tp}/${pos.length} | ${neg.length - fp}/${neg.length} | ${tp + fp ? pct(tp / (tp + fp)) : '-'} |`);
      }
    }
  }

  const aArms = listDir(path.join(root, 'audit')).sort();
  if (aArms.length) {
    L.push('', '## Setup audit (scan mode)', '', '| Arm | Runs | Gates correct | Private files opened | Report delivered (file + chat) | Tool calls | Input tokens | Duration (s) | Cost (USD) |', '|---|---|---|---|---|---|---|---|---|');
    for (const arm of aArms) {
      const rs = listDir(path.join(root, 'audit', arm)).map((f) => readJson(path.join(root, 'audit', arm, f)));
      const g = rs.filter((r) => r.gates);
      L.push(`| ${arm} | ${rs.length} | ${g.map((r) => `${r.gates.correct}/${r.gates.of}`).join(', ')} | ${rs.map((r) => r.privateOpened.length).join(', ')} | ${rs.filter((r) => r.reportWritten || r.reportInChat).length}/${rs.length} | ${fmt(mean(rs.map((r) => r.toolCalls)), 0)} | ${fmt(mean(nums(rs.map((r) => r.inputTokens))), 0)} | ${fmt(mean(nums(rs.map((r) => r.durationMs))) / 1000, 0)} | ${fmt(mean(nums(rs.map((r) => r.costUsd))), 3)} |`);
    }
  }

  if (o.gate) {
    // Release gate: precision may not regress; shape and cost are reported, not gated.
    const [base, cand] = o.gate.split(',');
    const facts = (a) => mean(nums(rows[a].map((r) => r.metrics.requiredHit)));
    const checks = [
      ['Judge correctness drop at most 0.1', mean(j(cand, 'correctness')) >= mean(j(base, 'correctness')) - 0.1],
      ['False claims per reply rise at most 0.1', mean(j(cand, 'false_claims')) <= mean(j(base, 'false_claims')) + 0.1],
      ['Required facts drop at most 2 points', facts(cand) >= facts(base) - 0.02],
    ];
    L.push('', `## Release gate: ${cand} against ${base}`, '', '| Condition | Result |', '|---|---|');
    for (const [label, ok] of checks) L.push(`| ${label} | ${ok ? 'pass' : 'FAIL'} |`);
    L.push('', `**Gate: ${checks.every(([, ok]) => ok) ? 'pass' : 'FAIL'}**`);
  }

  const md = L.join('\n') + '\n';
  fs.writeFileSync(path.join(o.out, 'report.md'), md);
  process.stdout.write(md);
}

// ---------------------------------------------------------------- main

const [cmd, ...rest] = process.argv.slice(2);
const o = args(rest);
const commands = { replies, judge, triggers, audit, rescore, report };
if (!commands[cmd]) {
  console.error('Usage: node bench/bench.mjs <replies|judge|triggers|audit|report> [options]. See bench/README.md.');
  process.exit(2);
}
await commands[cmd](o);
