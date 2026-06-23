#!/usr/bin/env node
'use strict';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const TIMEOUT_MS = Number(process.env.ROUTE_ENGINE_TIMEOUT_MS || 800);

function usage() {
  return [
    'Usage: node scripts/route-outbound-test.js --destination_phone 2145551212 [options]',
    '',
    'Environment:',
    '  ROUTE_ENGINE_BASE_URL  default http://127.0.0.1:3000',
    '  ROUTE_ENGINE_TOKEN     required',
    '',
    'Options or matching environment variables:',
    '  --campaign_id',
    '  --destination_phone    required',
    '  --lead_id',
    '  --list_id',
    '  --agent_id',
    '  --call_type            default manual',
    '  --lead_state',
    '  --client_id',
    '  --asterisk_uniqueid',
    '  --linkedid',
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

function value(args, key, envKey = key.toUpperCase()) {
  const cli = args[key];
  if (cli !== undefined && cli !== '') return String(cli);
  const env = process.env[envKey];
  if (env !== undefined && env !== '') return String(env);
  return undefined;
}

function compact(obj) {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== '') out[key] = val;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const baseUrl = (process.env.ROUTE_ENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const token = process.env.ROUTE_ENGINE_TOKEN || '';
  if (!token) {
    console.error(JSON.stringify({ ok: false, error: 'ROUTE_ENGINE_TOKEN is required' }));
    return 2;
  }

  const destinationPhone = value(args, 'destination_phone');
  if (!destinationPhone) {
    console.error(JSON.stringify({ ok: false, error: 'destination_phone is required' }));
    console.error(usage());
    return 2;
  }

  const payload = compact({
    request_id: value(args, 'request_id') || `route-test-${Date.now()}`,
    campaign_id: value(args, 'campaign_id'),
    destination_phone: destinationPhone,
    lead_id: value(args, 'lead_id'),
    list_id: value(args, 'list_id'),
    agent_id: value(args, 'agent_id'),
    call_type: value(args, 'call_type') || 'manual',
    lead_state: value(args, 'lead_state'),
    client_id: value(args, 'client_id'),
    asterisk_uniqueid: value(args, 'asterisk_uniqueid'),
    linkedid: value(args, 'linkedid'),
    source: 'route-outbound-test',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/route/outbound`, {
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

    const compactResponse = {
      http_status: res.status,
      ok: body.ok === true,
      allow_call: body.allow_call === true,
      route_id: body.route_id,
      mode: body.mode,
      decision: body.decision,
      selected_did: body.selected_did || body.did || body.caller_id || null,
      strategy: body.strategy || null,
      campaign_id: body.campaign_id || null,
      client_id: body.client_id || null,
      pool_type: body.pool_type || null,
      candidate_count: body.candidate_count,
      reason: body.reason || null,
      resolver_warnings: body.resolver_warnings || [],
    };
    console.log(JSON.stringify(compactResponse, null, 2));

    if (!res.ok) return 3;
    return compactResponse.allow_call ? 0 : 4;
  } catch (err) {
    const code = err && err.name === 'AbortError' ? 'route_engine_timeout' : 'route_engine_transport_error';
    console.error(JSON.stringify({ ok: false, code, error: err && err.message ? err.message : String(err) }));
    return 3;
  } finally {
    clearTimeout(timer);
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error(JSON.stringify({ ok: false, code: 'route_test_fatal', error: err && err.message ? err.message : String(err) }));
    process.exit(1);
  });
