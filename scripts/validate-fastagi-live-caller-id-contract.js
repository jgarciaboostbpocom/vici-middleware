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

const contractPath = 'docs/fastagi-live-caller-id-contract.md';
const cutoverPath = 'docs/live-caller-id-cutover-plan.md';
const statusPath = 'docs/middleware-current-status.md';
const contract = exists(contractPath) ? read(contractPath) : '';
const cutover = exists(cutoverPath) ? read(cutoverPath) : '';
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

const results = [
  check('FastAGI live caller ID contract exists', exists(contractPath)),
  check('document contains DO NOT APPLY', contract.includes('DO NOT APPLY')),
  check('document contains DESIGN ONLY', contract.includes('DESIGN ONLY')),
  check(
    'document states live caller ID is not enabled',
    contract.includes('Live caller ID is not enabled') ||
      contract.includes('live caller ID is not enabled'),
  ),
  check(
    'document states FastAGI is disabled',
    contract.includes('FastAGI is disabled'),
  ),
  check(
    'document states Asterisk/Vicidial carries call audio',
    contract.includes('Asterisk/Vicidial carries call audio'),
  ),
  check(
    'document states DIDs are owned by middleware',
    contract.includes('DIDs are owned by middleware'),
  ),
  check('document defines VICI_MW_SELECTED_DID', contract.includes('VICI_MW_SELECTED_DID')),
  check('document defines VICI_MW_SAFE_TO_APPLY_CALLER_ID', contract.includes('VICI_MW_SAFE_TO_APPLY_CALLER_ID')),
  check(
    'document includes safe apply rules',
    contract.includes('## Safe Apply Rules') &&
      contract.includes('safe_to_apply_caller_id=true') &&
      contract.includes('Route engine mode is `live`'),
  ),
  check(
    'document includes safe failure rules',
    contract.includes('## Safe Failure Rules') &&
      contract.includes('If middleware times out, do not apply middleware DID') &&
      contract.includes('No partial caller ID application is allowed'),
  ),
  check(
    'document includes security requirements',
    contract.includes('## Security Requirements') &&
      contract.includes('Never expose route token') &&
      contract.includes('RBAC/scoped access is required'),
  ),
  check(
    'document includes campaign-level enablement strategy',
    contract.includes('## Campaign-level Enablement Strategy') &&
      contract.includes('per campaign/client') &&
      contract.includes('Prevent restricted users from enabling global live behavior'),
  ),
  check(
    'document includes provider acceptance checks',
    contract.includes('## Provider Acceptance Checks') &&
      contract.includes('Confirm provider accepts the selected caller ID') &&
      contract.includes('Confirm DID ownership/authorization'),
  ),
  check(
    'document does not present Set(CALLERID(num)=...) as active/current behavior',
    contract.includes('DO NOT APPLY. DESIGN ONLY. NOT CURRENT STATE.') &&
      contract.includes('This is not current state') &&
      contract.includes('must not be applied to any live or real dialplan'),
  ),
  check(
    'cutover plan references the contract doc',
    cutover.includes('fastagi-live-caller-id-contract.md') &&
      cutover.includes('next required contract artifact'),
  ),
  check(
    'current status doc references the contract planning state',
    status.includes('FastAGI live caller ID contract: planning document only') &&
      status.includes('No runtime behavior changed') &&
      status.includes('exact live variable mechanism is still open'),
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
