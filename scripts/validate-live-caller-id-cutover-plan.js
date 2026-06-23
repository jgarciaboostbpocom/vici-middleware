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

const planPath = 'docs/live-caller-id-cutover-plan.md';
const statusPath = 'docs/middleware-current-status.md';
const plan = exists(planPath) ? read(planPath) : '';
const status = exists(statusPath) ? read(statusPath) : '';
const ui = read('public/ui-v2/did-ops.html');
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);
const changedFiles = gitOutput(['diff', '--name-only']);
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
const liveSetCallerId = 'Set(CALLERID(num)=<middleware_selected_did>)';
const liveSetCallerIdCount = plan.split(liveSetCallerId).length - 1;

const results = [
  check('live caller ID cutover plan exists', exists(planPath)),
  check('document contains DO NOT APPLY', plan.includes('DO NOT APPLY')),
  check(
    'Set(CALLERID(num)=<middleware_selected_did>) appears only as design pseudocode',
    liveSetCallerIdCount === 1 &&
      plan.includes('DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.') &&
      plan.includes('conceptual pseudocode'),
    `count=${liveSetCallerIdCount}`,
  ),
  check(
    'document states live caller ID is not enabled',
    plan.includes('Live caller ID is not enabled') ||
      plan.includes('live caller ID is not enabled'),
  ),
  check(
    'document states FastAGI remains disabled outside controlled tests',
    plan.includes('FastAGI disabled') &&
      plan.includes('approved staging test window') ||
      plan.includes('FastAGI remains disabled outside controlled tests'),
  ),
  check(
    'document states middleware owns DID decisions',
    includesAll(plan, [
      'middleware will remain the DID decision engine',
      'It owns and manages DID inventory',
    ]),
  ),
  check(
    'document states Asterisk/Vicidial carries call audio',
    plan.includes('Asterisk/Vicidial carries call audio'),
  ),
  check(
    'document includes Go / No-Go checklist',
    plan.includes('## Go / No-Go Checklist') &&
      plan.includes('Go criteria') &&
      plan.includes('No-go criteria'),
  ),
  check(
    'document includes rollback plan',
    plan.includes('## Rollback Plan') &&
      plan.includes('Restore Asterisk carrier block from backup') &&
      plan.includes('Verify middleware logs no longer receive live route requests'),
  ),
  check(
    'document includes safe failure behavior',
    plan.includes('## Safe Failure Behavior') &&
      plan.includes('If middleware is unreachable, Asterisk must not hang production unexpectedly') &&
      plan.includes('No partial caller ID application is allowed'),
  ),
  check(
    'current status doc includes Live Caller ID Cutover Status',
    status.includes('## Live Caller ID Cutover Status') &&
      status.includes('planning only') &&
      status.includes('live variable contract'),
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
