#!/usr/bin/env node
'use strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT_MS = Number(process.env.ROUTE_ENGINE_TIMEOUT_MS || 2000);

function usage() {
  return [
    'Usage: ROUTE_ENGINE_TOKEN=<token> node scripts/route-simulate.js [options]',
    '',
    'Environment:',
    '  ROUTE_ENGINE_BASE_URL  default http://127.0.0.1:3000',
    '  ROUTE_ENGINE_TOKEN     required',
    '',
    'Options:',
    '  --campaign_id          default TESTCAMP',
    '  --destination_phone    default 2145551212',
    '  --lead_state           default TX',
    '  --agent_id             default test-agent',
    '  --call_type            default manual',
    '  --include_raw          include full raw_response for terminal/internal debugging only',
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

function value(args, key, fallback) {
  const cli = args[key];
  if (cli !== undefined && cli !== '') return String(cli);
  return fallback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const token = process.env.ROUTE_ENGINE_TOKEN || '';
  if (!token) {
    console.error(JSON.stringify({ ok: false, error: 'ROUTE_ENGINE_TOKEN is required' }, null, 2));
    return 2;
  }

  const baseUrl = (process.env.ROUTE_ENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const payload = {
    campaign_id: value(args, 'campaign_id', 'TESTCAMP'),
    destination_phone: value(args, 'destination_phone', '2145551212'),
    lead_state: value(args, 'lead_state', 'TX'),
    agent_id: value(args, 'agent_id', 'test-agent'),
    call_type: value(args, 'call_type', 'manual'),
    include_raw: args.include_raw === 'true',
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/route/simulate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    console.log(JSON.stringify({ http_status: res.status, ...body }, null, 2));
    return res.ok ? 0 : 3;
  } catch (err) {
    const code = err && err.name === 'AbortError' ? 'route_simulator_timeout' : 'route_simulator_transport_error';
    console.error(JSON.stringify({ ok: false, code, error: err && err.message ? err.message : String(err) }, null, 2));
    return 3;
  } finally {
    clearTimeout(timer);
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error(JSON.stringify({ ok: false, code: 'route_simulator_fatal', error: err && err.message ? err.message : String(err) }, null, 2));
    process.exit(1);
  });
