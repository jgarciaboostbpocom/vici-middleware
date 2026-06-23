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

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle));
}

const modulePath = 'src/routeEngine/liveCallerIdContract.ts';
const docPath = 'docs/fastagi-live-caller-id-contract.md';
const moduleSource = exists(modulePath) ? read(modulePath) : '';
const doc = exists(docPath) ? read(docPath) : '';
const statusFiles = gitOutput(['status', '--short', '--untracked-files=all']);
const stagedFiles = gitOutput(['diff', '--cached', '--name-only']);
const changedFiles = gitOutput(['diff', '--name-only']);
const uiPath = 'public/ui-v2/did-ops.html';
const ui = exists(uiPath) ? read(uiPath) : '';

const requiredExports = [
  'export type LiveCallerIdRequest',
  'export type LiveCallerIdDecision',
  'export type LiveCallerIdAgiVariables',
  'export type LiveCallerIdSafetyCheck',
  'export type LiveCallerIdSafetyResult',
  'export const VICI_MW_OK',
  'export const VICI_MW_ALLOW_CALL',
  'export const VICI_MW_ROUTE_ID',
  'export const VICI_MW_DECISION',
  'export const VICI_MW_SELECTED_DID',
  'export const VICI_MW_FALLBACK_USED',
  'export const VICI_MW_REASON',
  'export const VICI_MW_SAFE_TO_APPLY_CALLER_ID',
  'export function buildLiveCallerIdAgiVariables',
  'export function evaluateLiveCallerIdSafety',
];

const forbiddenImports = [
  "from 'fs'",
  'from "fs"',
  "require('fs')",
  'require("fs")',
  "from 'child_process'",
  'from "child_process"',
  "require('child_process')",
  'require("child_process")',
  "from 'http'",
  'from "http"',
  "require('http')",
  'require("http")',
  "from 'https'",
  'from "https"',
  "require('https')",
  'require("https")',
  "from 'net'",
  'from "net"',
  "require('net')",
  'require("net")',
  "from 'express'",
  'from "express"',
  "require('express')",
  'require("express")',
  '../fastagi/',
  './shadowServer',
  'shadowServer',
  'FastAGI',
];

const forbiddenUiControls = [
  'enableFastAgi',
  'enableFastAGI',
  'enableLiveRouting',
  'saveReadiness',
  'writeReadiness',
  'restartFastAgi',
  'restartRouteEngine',
];

const runtimeStaged = stagedFiles.filter(file =>
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  file === 'data/vici_mw2_sessions.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file)
);
const distChanged = statusFiles.filter(line => /(^|\s)dist\//.test(line));

const results = [
  check('live caller ID contract module exists', exists(modulePath)),
  check('module exports required types, helpers, and constants', includesAll(moduleSource, requiredExports)),
  check('module contains VICI_MW_SELECTED_DID', moduleSource.includes('VICI_MW_SELECTED_DID')),
  check('module contains VICI_MW_SAFE_TO_APPLY_CALLER_ID', moduleSource.includes('VICI_MW_SAFE_TO_APPLY_CALLER_ID')),
  check(
    'module does not import runtime, network, process, FastAGI, or Asterisk server modules',
    forbiddenImports.every(needle => !moduleSource.includes(needle)),
    forbiddenImports.filter(needle => moduleSource.includes(needle)).join(', '),
  ),
  check('module does not contain Set(CALLERID', !moduleSource.includes('Set(CALLERID')),
  check('module does not add route-outbound-live', !moduleSource.includes('route-outbound-live')),
  check(
    'src/fastagi/shadowServer.ts is not modified',
    !changedFiles.includes('src/fastagi/shadowServer.ts') && !stagedFiles.includes('src/fastagi/shadowServer.ts'),
  ),
  check(
    'src/routes/route.ts is not modified',
    !changedFiles.includes('src/routes/route.ts') && !stagedFiles.includes('src/routes/route.ts'),
  ),
  check(
    'contract doc references inactive planning-only module',
    doc.includes('src/routeEngine/liveCallerIdContract.ts') &&
      doc.includes('inactive/planning-only') &&
      doc.includes('not wired into runtime live routing') &&
      doc.includes('does not enable FastAGI or caller ID changes'),
  ),
  check('no dist files changed', distChanged.length === 0, distChanged.join(', ')),
  check('no data files are staged', runtimeStaged.length === 0, runtimeStaged.join(', ')),
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
