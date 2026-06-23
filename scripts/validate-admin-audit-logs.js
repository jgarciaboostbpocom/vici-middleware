#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail: detail || '' };
}

function includesAll(text, needles) {
  return needles.every(needle => text.includes(needle));
}

function stagedFiles() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (err) {
    return [`<git status unavailable: ${err.message}>`];
  }
}

const auditStorage = read('src/storage/adminAudit.ts');
const adminV2 = read('src/routes/adminV2.ts');
const dids = read('src/routes/dids.ts');
const server = read('src/server.ts');
const ui = read('public/ui-v2/did-ops.html');
const staged = stagedFiles();
const runtimeStaged = staged.filter(file =>
  file === 'data/vici_mw2_sessions.json' ||
  file === 'data/dids.json' ||
  file === 'data/vici_mw2.json' ||
  /^data\/route_engine\/.*\.ndjson$/.test(file) ||
  /^data\/.*\.bak/.test(file) ||
  /^data\/admin_audit\/.*\.ndjson$/.test(file)
);

const results = [
  check(
    'audit storage helper exists',
    includesAll(auditStorage, [
      'appendAdminAuditEvent',
      'redactAuditPayload',
      'buildAuditActor',
      'getChangedFields',
      'admin-audit.ndjson',
      'fsp.appendFile',
    ]),
  ),
  check(
    'redaction covers sensitive field names',
    includesAll(auditStorage, ['password', 'token', 'secret', 'key', 'hash', 'authorization', '[REDACTED]']),
  ),
  check(
    'audit endpoint exists',
    adminV2.includes("adminV2Router.get('/audit-logs'") && adminV2.includes('listAdminAuditEvents'),
  ),
  check(
    'audit endpoint is behind admin auth mount',
    server.includes("app.use('/admin/v2', adminAuth, adminV2Router)"),
  ),
  check(
    'admin mutations append audit events',
    includesAll(adminV2, [
      'client.create',
      'campaign.create',
      'campaign_rules.update',
      'user.create',
      'user.password_reset',
      'appendAdminAuditEvent',
    ]),
  ),
  check(
    'DID mutations append audit events',
    includesAll(dids, [
      'did.create',
      'did.bulk_import',
      'did.pause',
      'did.cooldown',
      'did.reactivate',
      'did.remove',
      'did.spam_report',
      'lead_exclusion.create',
      'lead_exclusion.remove',
      'appendAdminAuditEvent',
    ]),
  ),
  check(
    'UI has Audit Logs menu and view',
    includesAll(ui, [
      'data-view="audit-logs"',
      'Audit Logs',
      'auditLogsBody',
      'renderAuditLogs',
      'loadAuditLogs',
      '/admin/v2/audit-logs',
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
