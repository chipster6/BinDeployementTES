#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ACTION = process.argv[2] || 'enforce';
const ROOT = process.cwd();
const BASELINE_PATH = path.join(ROOT, 'types', 'ts-errors-baseline.json');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { shell: true, encoding: 'utf8', ...opts });
  return { code: res.status ?? 0, out: (res.stdout || '') + (res.stderr || '') };
}

function countTsErrors(output) {
  // Count all "error TS1234:" occurrences
  const matches = output.match(/error TS\d+:/g);
  return matches ? matches.length : 0;
}

function tscVersion() {
  const { out } = run('npx', ['tsc', '-v']);
  return out.trim();
}

function ensureBaselineDir() {
  const dir = path.dirname(BASELINE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeBaseline(count) {
  ensureBaselineDir();
  const data = {
    count,
    compiler: tscVersion(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}

function runTSC() {
  // Full project check using the repo tsconfig (preserves paths like "@/...")
  const args = ['tsc', '--noEmit', '--pretty', 'false'];
  const { code, out } = run('npx', args);
  const count = countTsErrors(out);
  return { code, out, count };
}

function logHeader(title) {
  console.log(`\n──────────────── ${title} ────────────────`);
}

(function main() {
  if (!['save', 'enforce'].includes(ACTION)) {
    console.error('Usage: node scripts/ts-errors-baseline.js [save|enforce]');
    process.exit(2);
  }

  const { count, out } = runTSC();
  const baseline = readBaseline();

  if (ACTION === 'save') {
    const prev = baseline?.count ?? null;
    const saved = writeBaseline(count);
    logHeader('TypeScript Baseline Saved');
    console.log(`New baseline: ${saved.count} errors (was ${prev ?? 'n/a'})`);
    process.exit(0);
  }

  // enforce
  if (!baseline) {
    // First-time adoption: create baseline at current count and allow the pipeline.
    const saved = writeBaseline(count);
    logHeader('Baseline Created');
    console.log(
      `Created baseline at ${saved.count} errors. ` +
      `Enforcement starts now; future PRs must not exceed this count.`,
    );
    process.exit(0);
  }

  const delta = count - baseline.count;
  logHeader('TypeScript Regression Gate');
  console.log(`Current: ${count} errors | Baseline: ${baseline.count} | Delta: ${delta >= 0 ? '+' : ''}${delta}`);

  if (count > baseline.count) {
    console.error('\n❌ Regression detected: TS error count increased.');
    console.error('Hint: run `npm run typecheck:top` to see the worst-offenders, then fix a few and commit.');
    // Show a small tail of the compiler output to aid debugging
    const tail = out.split('\n').slice(-40).join('\n');
    console.error('\n--- tsc (last 40 lines) ---\n' + tail + '\n---------------------------\n');
    process.exit(1);
  }

  console.log('✅ OK — no regression.');
  process.exit(0);
})();