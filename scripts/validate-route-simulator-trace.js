#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle));
}

function stagedFiles() {
  try {
    return execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git status unavailable: ${err.message}>`];
  }
}

const types = read('src/routeEngine/types.ts');
const simulator = read('src/routeEngine/simulator.ts');
const adminRouteEngine = read('src/routes/adminRouteEngine.ts');
const ui = read('public/ui-v2/did-ops.html');
const staged = stagedFiles();
const runtimeStaged = staged.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);

const results = [
  check(
    'trace types exist',
    includesAll(types, [
      'RouteSimulationTrace',
      'RouteCandidateTrace',
      'RouteRejectionReason',
      'RouteMatchedRuleTrace',
    ]),
  ),
  check(
    'simulator response includes trace',
    includesAll(simulator, [
      'trace: RouteSimulationTrace',
      'buildSimulationTrace',
      'trace,',
      'candidates: traces',
      'rejectedCount',
    ]),
  ),
  check(
    'admin route-engine simulate endpoint returns trace',
    adminRouteEngine.includes("adminRouteEngineRouter.post('/simulate'")
      && adminRouteEngine.includes('const response = await handleRouteSimulation')
      && adminRouteEngine.includes('...response'),
  ),
  check(
    'UI has simulator trace table elements',
    includesAll(ui, [
      'routeEngineTracePanel',
      'renderRouteEngineTrace',
      'routeEngineTraceCandidatesBody',
      'Candidate Trace',
      'Rejected reasons',
    ]),
  ),
  check(
    'runtime data files are not staged',
    runtimeStaged.length === 0,
    runtimeStaged.join(', '),
  ),
];

const failed = results.filter(result => !result.ok);
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  checks: results,
  stagedFiles: staged,
}, null, 2)}\n`);

if (failed.length) process.exit(1);
