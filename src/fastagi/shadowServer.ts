import { randomUUID } from 'crypto';
import { promises as fsp } from 'fs';
import net from 'net';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';
import { handleOutboundRoute } from '../routeEngine/outbound';

const LOG_FILE = '/opt/vici-mw/logs/route-fastagi-shadow.log';

type AgiEnv = Record<string, string>;

type FastAgiLog = {
  timestamp: string;
  agi_uniqueid?: string | null;
  campaign_id?: string | null;
  destination_phone?: string | null;
  route_id?: string | null;
  decision?: string | null;
  selected_did?: string | null;
  mode?: string | null;
  allow_call?: boolean;
  error?: string | null;
};

export function startFastAgiShadowServer(): net.Server | null {
  if (!config.fastagi.enabled) {
    logger.info({ enabled: false }, 'fastagi-shadow-disabled');
    return null;
  }

  const server = net.createServer(socket => {
    handleConnection(socket).catch(err => {
      logger.warn({ err: err?.message || String(err) }, 'fastagi-shadow-connection-error');
      safeVerbose(socket, 'vici-mw fastagi shadow error; continuing with existing caller ID');
      closeSocket(socket);
    });
  });

  server.on('error', err => {
    logger.error({
      err: (err as Error).message,
      host: config.fastagi.host,
      port: config.fastagi.port,
    }, 'fastagi-shadow-server-error');
  });

  try {
    server.listen(config.fastagi.port, config.fastagi.host, () => {
      logger.info({
        host: config.fastagi.host,
        port: config.fastagi.port,
        timeoutMs: config.fastagi.timeoutMs,
      }, 'fastagi-shadow-listening');
    });
  } catch (err: any) {
    logger.error({
      err: err?.message || String(err),
      host: config.fastagi.host,
      port: config.fastagi.port,
    }, 'fastagi-shadow-start-failed');
    return null;
  }

  return server;
}

async function handleConnection(socket: net.Socket): Promise<void> {
  socket.setEncoding('utf8');
  const agiEnv = await readAgiEnv(socket, safeTimeoutMs());
  const payload = buildRoutePayload(agiEnv);

  if (!payload.destination_phone) {
    await appendLog(logRecord(agiEnv, payload, null, 'missing_destination_phone'));
    safeVerbose(socket, 'vici-mw fastagi shadow skipped: missing destination phone');
    return closeSocket(socket);
  }

  try {
    const response = await withTimeout(
      handleOutboundRoute(payload),
      safeTimeoutMs(),
      'route_engine_timeout',
    );
    await appendLog(logRecord(agiEnv, payload, response, null));
    safeVerbose(socket, routeVerboseMessage(response));
  } catch (err: any) {
    const message = err?.message || String(err);
    await appendLog(logRecord(agiEnv, payload, null, message));
    safeVerbose(socket, `vici-mw fastagi shadow ${message}; continuing with existing caller ID`);
  } finally {
    closeSocket(socket);
  }
}

function readAgiEnv(socket: net.Socket, timeoutMs: number): Promise<AgiEnv> {
  return new Promise(resolve => {
    let buffer = '';
    let done = false;
    const timer = setTimeout(() => finish(), timeoutMs);

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('error', finish);
      resolve(parseAgiEnv(buffer));
    }

    function onData(chunk: string | Buffer) {
      buffer += chunk.toString();
      if (buffer.includes('\n\n') || buffer.includes('\r\n\r\n')) finish();
    }

    socket.on('data', onData);
    socket.on('error', finish);
    socket.on('end', finish);
  });
}

function parseAgiEnv(raw: string): AgiEnv {
  const env: AgiEnv = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) break;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function buildRoutePayload(agiEnv: AgiEnv) {
  const uniqueid = firstValue(agiEnv.agi_uniqueid);
  const destination = normalizePhone(firstValue(agiEnv.agi_arg_1, agiEnv.agi_extension));
  const campaignId = firstValue(agiEnv.agi_arg_2);
  return compact({
    request_id: `fastagi-shadow-${uniqueid || randomUUID()}`,
    asterisk_uniqueid: uniqueid,
    linkedid: firstValue(agiEnv.agi_linkedid, uniqueid),
    campaign_id: campaignId,
    destination_phone: destination,
    lead_id: firstValue(agiEnv.agi_arg_3),
    list_id: firstValue(agiEnv.agi_arg_4),
    agent_id: firstValue(agiEnv.agi_arg_5, agiEnv.agi_accountcode),
    call_type: firstValue(agiEnv.agi_arg_6, 'manual'),
    lead_state: firstValue(agiEnv.agi_arg_7),
    source: 'asterisk-fastagi-shadow',
  });
}

function routeVerboseMessage(response: any): string {
  const selected = response?.selected_did || response?.did || response?.caller_id || 'none';
  const decision = response?.decision || 'unknown';
  const mode = response?.mode || 'unknown';
  return `vici-mw fastagi shadow decision=${decision} mode=${mode} selected_did=${selected}; caller ID unchanged`;
}

function logRecord(agiEnv: AgiEnv, payload: any, response: any, error: string | null): FastAgiLog {
  return {
    timestamp: new Date().toISOString(),
    agi_uniqueid: agiEnv.agi_uniqueid || null,
    campaign_id: payload?.campaign_id || null,
    destination_phone: payload?.destination_phone || null,
    route_id: response?.route_id || null,
    decision: response?.decision || null,
    selected_did: response?.selected_did || response?.did || response?.caller_id || null,
    mode: response?.mode || null,
    allow_call: response?.allow_call === true,
    error,
  };
}

async function appendLog(record: FastAgiLog): Promise<void> {
  try {
    await fsp.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fsp.appendFile(LOG_FILE, `${JSON.stringify(record)}\n`, 'utf8');
  } catch (err: any) {
    logger.warn({ err: err?.message || String(err) }, 'fastagi-shadow-log-write-failed');
  }
}

function safeVerbose(socket: net.Socket, message: string): void {
  const safe = String(message || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 900);
  if (!socket.destroyed) socket.write(`VERBOSE "${safe}" 1\n`);
}

function closeSocket(socket: net.Socket): void {
  if (socket.destroyed) return;
  socket.end();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function safeTimeoutMs(): number {
  return Number.isFinite(config.fastagi.timeoutMs) && config.fastagi.timeoutMs > 0
    ? config.fastagi.timeoutMs
    : 800;
}

function firstValue(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return undefined;
}

function normalizePhone(value: string | undefined): string | undefined {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits || undefined;
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') {
      out[key as keyof T] = value as T[keyof T];
    }
  }
  return out;
}
