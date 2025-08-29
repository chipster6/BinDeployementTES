#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { shell: true, encoding: 'utf8', ...opts });
  return { code: res.status ?? 0, out: (res.stdout || '') + (res.stderr || '') };
}

function resolveBaseRef() {
  // Prefer origin/main, then main, else previous commit
  if (run('git', ['rev-parse', '--verify', 'origin/main']).code === 0) return 'origin/main';
  if (run('git', ['rev-parse', '--verify', 'main']).code === 0) return 'main';
  return 'HEAD~1';
}

function listChangedTsFiles(baseRef) {
  const patterns = ['--', '*.ts', '*.tsx'];
  const diffArgs = ['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`, ...patterns];
  const { out, code } = run('git', diffArgs);
  if (code !== 0) return [];
  return out
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(f => !f.endsWith('.d.ts'));
}

function writeTempTsconfig(files) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tscheck-'));
  const tmpPath = path.join(tmpDir, 'tsconfig.tmp.json');
  const config = {
    extends: './tsconfig.json',
    include: files,
    compilerOptions: {
      // Do not emit; rely on main config for paths/baseUrl
      noEmit: true,
    },
  };
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf8');
  return tmpPath;
}

(function main() {
  const baseRef = resolveBaseRef();
  const files = listChangedTsFiles(baseRef);

  if (files.length === 0) {
    console.log('No modified TypeScript files detected — skipping incremental typecheck.');
    process.exit(0);
  }

  console.log(`Type-checking ${files.length} modified file(s) since ${baseRef}…`);
  const tmpTsconfig = writeTempTsconfig(files);
  const { code, out } = run('npx', ['tsc', '-p', tmpTsconfig, '--pretty', 'false']);

  process.stdout.write(out);
  process.exit(code);
})();