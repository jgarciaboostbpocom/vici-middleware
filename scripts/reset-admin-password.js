#!/usr/bin/env node
'use strict';

const { validatePasswordPolicy } = require('../dist/auth/passwords');
const { getUserByUsername, setUserPassword, upsertUser } = require('../dist/storage/tenants');

function usage() {
  return [
    'Usage:',
    '  ADMIN_USERNAME=admin ADMIN_PASSWORD=<new-password> node scripts/reset-admin-password.js',
    '  node scripts/reset-admin-password.js --username admin --password <new-password>',
    '',
    'Password policy: at least 10 characters, at least one letter, and at least one number.',
    'This script does not print passwords or password hashes.',
  ].join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq >= 0) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = 'true';
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const username = String(args.username || process.env.ADMIN_USERNAME || '').trim();
  const password = String(args.password || process.env.ADMIN_PASSWORD || '');

  if (!username || !password) {
    console.error(JSON.stringify({ ok: false, error: 'ADMIN_USERNAME and ADMIN_PASSWORD are required' }));
    console.error(usage());
    return 2;
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.ok) {
    console.error(JSON.stringify({ ok: false, error: policy.errors.join('; ') }));
    return 2;
  }

  const existing = await getUserByUsername(username);
  if (!existing) {
    await upsertUser({
      username,
      role: 'super_admin',
      assignedClientIds: [],
      assignedCampaignIds: [],
      active: true,
    });
  } else if (existing.role !== 'super_admin' || existing.active === false) {
    await upsertUser({
      username,
      role: 'super_admin',
      assignedClientIds: existing.assignedClientIds || [],
      assignedCampaignIds: existing.assignedCampaignIds || [],
      active: true,
    });
  }

  const updated = await setUserPassword(username, password);
  if (!updated) {
    console.error(JSON.stringify({ ok: false, error: 'failed to create or update super_admin user' }));
    return 1;
  }

  console.log(JSON.stringify({
    ok: true,
    username: updated.username,
    role: updated.role,
    active: updated.active,
    passwordUpdated: true,
  }));
  return 0;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) }));
    process.exit(1);
  });
