#!/usr/bin/env node
'use strict';

const { promises: fsp } = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = '/opt/vici-mw';
const LOG_FILE = path.join(ROOT_DIR, 'logs', 'route-agi-shadow.log');
const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';

function agiVerbose(message, level = 1) {
  const safe = String(message || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 900);
  process.stdout.write(`VERBOSE "${safe}" ${level}\n`);
}

async function readAgiEnvironment() {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  const env = {};
  for await (const line of rl) {
    if (!line.trim()) break;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function parseAgiArgs(agiEnv) {
  const positional = [];
  const named = {};
  Object.keys(agiEnv)
    .filter(key => /^agi_arg_\d+$/.test(key))
    .sort((left, right) => Number(left.slice(8)) - Number(right.slice(8)))
    .forEach(key => {
      const value = agiEnv[key];
      if (!value) return;
      positional.push(value);
      const eq = value.indexOf('=');
      if (eq > 0) {
        const name = normalizeKey(value.slice(0, eq));
        const val = value.slice(eq + 1).trim();
        if (name && val) named[name] = val;
      }
    });
  return { positional, named };
}

function normalizeKey(value) {
  return String(value || '').trim().replace(/^--?/, '').replace(/-/g, '_').toLowerCase();
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return undefined;
}

function digits(value) {
  const normalized = String(value || '').replace(/\D/g, '');
  if (normalized.length === 11 && normalized.startsWith('1')) return normalized.slice(1);
  if (normalized.length > 10) return normalized.slice(-10);
  return normalized || undefined;
}

function compact(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

function buildPayload(agiEnv, args) {
  const named = args.named;
  const positional = args.positional;
  const uniqueid = firstValue(named.asterisk_uniqueid, named.uniqueid, agiEnv.agi_uniqueid);
  const destination = digits(firstValue(
    named.destination_phone,
    named.destination,
    named.dest,
    named.phone,
    positional[0] && !positional[0].includes('=') ? positional[0] : undefined,
    agiEnv.agi_extension,
    process.env.DESTINATION_PHONE,
  ));
  const campaignId = firstValue(
    named.campaign_id,
    named.campaign,
    positional[1] && !positional[1].includes('=') ? positional[1] : undefined,
    process.env.CAMPAIGN_ID,
  );

  return compact({
    request_id: uniqueid ? `agi-shadow-${uniqueid}` : `agi-shadow-${Date.now()}`,
    asterisk_uniqueid: uniqueid,
    linkedid: firstValue(named.linkedid, named.linked_id, agiEnv.agi_linkedid, uniqueid),
    campaign_id: campaignId,
    destination_phone: destination,
    lead_id: firstValue(named.lead_id, process.env.LEAD_ID),
    list_id: firstValue(named.list_id, process.env.LIST_ID),
    agent_id: firstValue(named.agent_id, named.user, process.env.AGENT_ID, agiEnv.agi_accountcode),
    call_type: firstValue(named.call_type, process.env.CALL_TYPE, 'manual'),
    lead_state: firstValue(named.lead_state, named.state, process.env.LEAD_STATE),
    client_id: firstValue(named.client_id, process.env.CLIENT_ID),
    source: 'asterisk-agi-shadow',
  });
}

async function appendLog(record) {
  try {
    await fsp.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fsp.appendFile(LOG_FILE, `${JSON.stringify(record)}\n`, 'utf-8');
  } catch {
    // Logging must never break AGI call flow.
  }
}

async function postRoute(payload) {
  const baseUrl = (process.env.ROUTE_ENGINE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const token = process.env.ROUTE_ENGINE_TOKEN || '';
  const timeoutMs = Number(process.env.ROUTE_ENGINE_TIMEOUT_MS || 800);
  if (!token) {
    return {
      ok: false,
      transportError: true,
      error: 'ROUTE_ENGINE_TOKEN is not configured',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 800);
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
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { parse_error: true };
    }
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  } catch (err) {
    return {
      ok: false,
      transportError: true,
      timeout: err && err.name === 'AbortError',
      error: err && err.message ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function decisionLog(agiEnv, payload, response, error) {
  const body = response && response.body ? response.body : {};
  return {
    timestamp: new Date().toISOString(),
    agi_uniqueid: agiEnv.agi_uniqueid || null,
    campaign_id: payload.campaign_id || null,
    destination_phone: payload.destination_phone || null,
    route_id: body.route_id || null,
    decision: body.decision || null,
    selected_did: body.selected_did || body.did || body.caller_id || null,
    mode: body.mode || null,
    allow_call: body.allow_call === true,
    error: error || response?.error || (response && response.status && response.status >= 400 ? `http_${response.status}` : null),
  };
}

async function main() {
  const agiEnv = await readAgiEnvironment();
  const args = parseAgiArgs(agiEnv);
  const payload = buildPayload(agiEnv, args);

  agiVerbose('vici-mw route outbound shadow wrapper start');

  if (!payload.destination_phone) {
    await appendLog(decisionLog(agiEnv, payload, null, 'missing_destination_phone'));
    agiVerbose('vici-mw route shadow skipped: missing destination_phone');
    return 0;
  }

  const response = await postRoute(payload);
  const body = response.body || {};
  await appendLog(decisionLog(agiEnv, payload, response, null));

  if (response.timeout) {
    agiVerbose('vici-mw route shadow timeout; continuing with existing caller ID');
    return 0;
  }
  if (response.transportError) {
    agiVerbose('vici-mw route shadow transport/auth error; continuing with existing caller ID');
    return 0;
  }
  if (!response.ok) {
    agiVerbose(`vici-mw route shadow HTTP ${response.status}; continuing with existing caller ID`);
    return 0;
  }

  const selected = body.selected_did || body.did || body.caller_id || 'none';
  const decision = body.decision || 'unknown';
  const mode = body.mode || 'unknown';
  agiVerbose(`vici-mw route shadow decision=${decision} mode=${mode} selected_did=${selected}; caller ID unchanged`);
  return 0;
}

main()
  .then(() => process.exit(0))
  .catch(async err => {
    try {
      await appendLog({
        timestamp: new Date().toISOString(),
        error: err && err.message ? err.message : String(err),
      });
      agiVerbose('vici-mw route shadow fatal wrapper error; continuing with existing caller ID');
    } catch {
      // Ignore final logging failures.
    }
    process.exit(0);
  });
