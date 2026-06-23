#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle));
}

function gitOutput(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git unavailable: ${err.message}>`];
  }
}

const runbookPath = 'docs/asterisk-fastagi-shadow-validation.md';
const statusPath = 'docs/middleware-current-status.md';
const runbook = exists(runbookPath) ? read(runbookPath) : '';
const status = exists(statusPath) ? read(statusPath) : '';
const ui = read('public/ui-v2/did-ops.html');
const changedFiles = gitOutput(['diff', '--name-only']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);
const runtimeStaged = stagedFiles.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);
const distChanged = statusFiles.filter(line => /(^|\s)dist\//.test(line));
const forbiddenUiControls = [
  'enableFastAgi',
  'enableFastAGI',
  'enableLiveRouting',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
];

const results = [
  check('FastAGI shadow validation runbook exists', exists(runbookPath)),
  check(
    'runbook contains tested context and carrier details',
    includesAll(runbook, [
      '[vici-mw-fastagi-shadow-test]',
      '[vicidial-auto-external]',
      '_31XXXXXXXXXX',
      'Nobel Biz Outbound',
      'route-outbound-shadow',
    ]),
  ),
  check(
    'runbook contains rollback instructions',
    includesAll(runbook, [
      'Rollback Commands',
      'extensions-vicidial.conf',
      'dialplan reload',
      'FastAGI port closed',
    ]),
  ),
  check(
    'runbook warns not to add Set(CALLERID(num)=...)',
    runbook.includes('Do not add `Set(CALLERID(num)=...)`'),
  ),
  check(
    'runbook states FastAGI remains disabled outside controlled tests',
    runbook.includes('FastAGI must remain disabled unless running a controlled shadow test'),
  ),
  check(
    'runbook states live caller ID is not enabled',
    runbook.includes('Live caller ID is not enabled yet'),
  ),
  check(
    'runbook states middleware does not carry call audio',
    runbook.includes('middleware does not carry call audio') ||
      runbook.includes('Middleware does not carry call audio'),
  ),
  check(
    'runbook states DIDs are owned/managed by middleware',
    runbook.includes('DIDs are owned and managed by the middleware'),
  ),
  check(
    'current status records PASS validation and final safe state',
    includesAll(status, [
      'FastAGI real Asterisk shadow validation: PASS',
      'Real outbound carrier shadow insertion validation: PASS',
      'Outbound carrier patch rollback: PASS',
      'FastAGI disabled, port `4573` closed, route engine shadow, Vicidial outbound restored, live caller ID not enabled',
    ]),
  ),
  check(
    'no dist files changed',
    distChanged.length === 0,
    distChanged.join(', '),
  ),
  check(
    'no data files are staged',
    runtimeStaged.length === 0,
    runtimeStaged.join(', '),
  ),
  check(
    'no enable/toggle UI controls added',
    forbiddenUiControls.every(needle => !ui.includes(needle)),
    forbiddenUiControls.filter(needle => ui.includes(needle)).join(', '),
  ),
];

const failed = results.filter(result => !result.ok);
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  checks: results,
  changedFiles,
  stagedFiles,
}, null, 2)}\n`);

if (failed.length) process.exit(1);
